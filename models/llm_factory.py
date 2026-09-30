import os
from collections import defaultdict
from functools import lru_cache

from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_mistralai import ChatMistralAI
from langchain_openai import ChatOpenAI


# Load environment variables before reading model configuration.
load_dotenv()


# =========================================================
# PROVIDER CONFIGURATION
# =========================================================

PROVIDER_MODELS = {
    "gemini": os.getenv("GEMINI_MODEL", "gemini-3.6-flash"),
    "groq": os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
    "mistral": os.getenv("MISTRAL_MODEL", "mistral-small-latest"),
    "openai": os.getenv("OPENAI_MODEL", "gpt-5.6"),
    "anthropic": os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6"),
}

DEFAULT_FALLBACK_PROVIDERS = (
    "groq",
    "mistral",
    "openai",
    "anthropic",
)

PROVIDER_ENV_KEYS = {
    "gemini": ("GEMINI_API_KEY", "GOOGLE_API_KEY"),
    "groq": ("GROQ_API_KEY",),
    "mistral": ("MISTRAL_API_KEY",),
    "openai": ("OPENAI_API_KEY",),
    "anthropic": ("ANTHROPIC_API_KEY",),
}


# =========================================================
# LLM USAGE TRACKING
# =========================================================

_LLM_USAGE = {
    "total_calls": 0,
    "providers": defaultdict(int),
    "agents": defaultdict(int),
}


def reset_llm_usage():
    _LLM_USAGE["total_calls"] = 0
    _LLM_USAGE["providers"].clear()
    _LLM_USAGE["agents"].clear()


def _record_llm_call(provider: str, agent_name: str | None = None):
    provider = provider.lower().strip()
    _LLM_USAGE["total_calls"] += 1
    _LLM_USAGE["providers"][provider] += 1

    if agent_name:
        _LLM_USAGE["agents"][agent_name] += 1

    print(
        f"[LLM] {provider.upper()} "
        f"| Agent: {agent_name or 'unknown'} "
        f"| Call #{_LLM_USAGE['total_calls']}"
    )


def get_llm_usage():
    return {
        "total_calls": _LLM_USAGE["total_calls"],
        "providers": dict(_LLM_USAGE["providers"]),
        "agents": dict(_LLM_USAGE["agents"]),
    }


def print_llm_usage():
    usage = get_llm_usage()
    print()
    print("=" * 64)
    print(" LLM USAGE")
    print("=" * 64)
    print(f"Total calls: {usage['total_calls']}")
    print()
    print("BY PROVIDER")
    for provider, count in usage["providers"].items():
        print(f"- {provider}: {count}")
    if not usage["providers"]:
        print("- none")
    print()
    print("BY AGENT")
    for agent, count in usage["agents"].items():
        print(f"- {agent}: {count}")
    if not usage["agents"]:
        print("- none")
    print("=" * 64)
    print()


# =========================================================
# PROVIDER HELPERS
# =========================================================


def _provider_configured(provider: str) -> bool:
    keys = PROVIDER_ENV_KEYS.get(provider.lower().strip(), ())
    return any(os.getenv(key, "").strip() for key in keys)


def _fallback_order(primary: str, fallback_provider: str | None = None):
    configured = os.getenv(
        "LLM_FALLBACK_PROVIDERS",
        ",".join(DEFAULT_FALLBACK_PROVIDERS),
    )

    providers = [
        item.strip().lower()
        for item in configured.split(",")
        if item.strip()
    ]

    if fallback_provider:
        fallback_provider = fallback_provider.strip().lower()
        providers.insert(0, fallback_provider)

    result = []
    for candidate in providers:
        if candidate == primary:
            continue
        if candidate not in PROVIDER_MODELS:
            continue
        if candidate not in result:
            result.append(candidate)

    return result


# =========================================================
# LLM CREATION
# =========================================================

@lru_cache(maxsize=None)
def get_llm(provider: str = "gemini"):
    provider = provider.lower().strip()

    if provider == "gemini":
        return ChatGoogleGenerativeAI(
            model=PROVIDER_MODELS["gemini"],
            temperature=0,
        )

    if provider == "groq":
        return ChatGroq(
            model=PROVIDER_MODELS["groq"],
            temperature=0,
        )

    if provider == "mistral":
        return ChatMistralAI(
            model=PROVIDER_MODELS["mistral"],
            temperature=0,
        )

    if provider == "openai":
        return ChatOpenAI(
            model=PROVIDER_MODELS["openai"],
            temperature=0,
        )

    if provider == "anthropic":
        return ChatAnthropic(
            model=PROVIDER_MODELS["anthropic"],
            temperature=0,
        )

    raise ValueError(f"Unsupported LLM provider: {provider}")


# =========================================================
# RATE-LIMIT / QUOTA DETECTION
# =========================================================


def _is_rate_limit_error(error: Exception) -> bool:
    message = str(error).lower()
    indicators = (
        "429",
        "rate limit",
        "rate_limit",
        "resource exhausted",
        "resource_exhausted",
        "quota",
        "too many requests",
        "requests per minute",
        "tokens per minute",
        "quota exceeded",
        "quota_exceeded",
    )
    return any(indicator in message for indicator in indicators)


# =========================================================
# RETRY + FALLBACK CHAIN
# =========================================================


def invoke_with_retry(
    llm,
    prompt: str,
    provider: str = "gemini",
    fallback_provider: str | None = None,
    agent_name: str | None = None,
):
    """
    Invoke the primary provider and automatically fail over through
    every configured provider when a provider is rate-limited or fails.

    Primary -> Groq -> Mistral -> OpenAI -> Anthropic

    The primary provider is never called twice in the same request.
    Unconfigured fallback providers are skipped.
    """

    primary = provider.lower().strip()

    # First try the already-created primary LLM.
    try:
        _record_llm_call(primary, agent_name)
        return llm.invoke(prompt)
    except Exception as primary_error:
        if not _is_rate_limit_error(primary_error):
            raise

        print(
            f"[LLM] {primary.upper()} rate-limited or quota exhausted."
        )

    # Then walk the configured fallback chain.
    failures = [f"{primary}: rate limited/quota exhausted"]

    for fallback in _fallback_order(primary, fallback_provider):
        if not _provider_configured(fallback):
            print(
                f"[LLM] Skipping {fallback.upper()}: "
                "API key is not configured."
            )
            continue

        try:
            print(f"[LLM] Trying fallback provider: {fallback.upper()}...")
            fallback_llm = get_llm(fallback)
            _record_llm_call(fallback, agent_name)
            response = fallback_llm.invoke(prompt)
            print(f"[LLM] Fallback succeeded with {fallback.upper()}.")
            return response
        except Exception as fallback_error:
            failures.append(f"{fallback}: {fallback_error}")
            print(f"[LLM] {fallback.upper()} fallback failed: {fallback_error}")

    raise RuntimeError(
        "All configured LLM providers failed. "
        + " | ".join(failures)
    )
