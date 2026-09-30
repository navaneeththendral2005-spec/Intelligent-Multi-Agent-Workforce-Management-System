import warnings

from dotenv import load_dotenv

# Load environment variables before importing agent modules.
load_dotenv()

from agents.manager_agent import ManagerAgent
from agents.developer_agent import DeveloperAgent
from agents.backend_agent import BackendAgent
from agents.code_generator_agent import CodeGeneratorAgent
from agents.research_agent import ResearchAgent
from agents.content_agent import ContentAgent
from agents.registry import AgentRegistry
from agents.data_analyst_agent import DataAnalystAgent
from agents.document_agent import DocumentAgent
from agents.communication_agent import CommunicationAgent
from agents.orchestrator import AgentOrchestrator
from agents.tester_agent import TesterAgent
from agents.debugger_agent import DebuggerAgent
from agents.code_reviewer_agent import CodeReviewerAgent
from agents.code_fixer_agent import CodeFixerAgent


# ---------------------------------------------------------
# SUPPRESS KNOWN WARNINGS
# ---------------------------------------------------------

warnings.filterwarnings(
    "ignore",
    message="Model .* uses fixed sampling defaults.*",
)

warnings.filterwarnings(
    "ignore",
    message="Direct use of automatic function calling.*",
)


# =========================================================
# MULTI-AGENT WORKFLOW
# =========================================================

class MultiAgentWorkflow:
    """
    Main workflow for CHORUS.

    Creates, registers, and manages all available agents.
    """

    def __init__(self):

        # -------------------------------------------------
        # AGENT REGISTRY
        # -------------------------------------------------

        self.registry = AgentRegistry()

        # -------------------------------------------------
        # GEMINI AGENTS
        # -------------------------------------------------

        self.manager = ManagerAgent(
            provider="groq"
        )

        self.research = ResearchAgent(
            provider="gemini"
        )

        self.content = ContentAgent(
            provider="gemini"
        )

        self.data_analyst = DataAnalystAgent(
            provider="gemini"
        )

        self.document = DocumentAgent(
            provider="gemini"
        )

        self.communication = CommunicationAgent(
            provider="gemini"
        )

        # -------------------------------------------------
        # GROQ AGENTS
        # -------------------------------------------------

        self.developer = DeveloperAgent(
            provider="groq"
        )

        self.backend = BackendAgent(
            provider="groq"
        )

        self.code_generator = CodeGeneratorAgent(
            provider="groq"
        )

        self.tester = TesterAgent(
            provider="groq"
        )

        self.debugger = DebuggerAgent(
            provider="groq"
        )

        self.code_reviewer = CodeReviewerAgent(
            provider="groq"
        )

        self.code_fixer = CodeFixerAgent(
            provider="groq"
        )

        # -------------------------------------------------
        # REGISTER AGENTS
        # -------------------------------------------------

        self.registry.register(
            "manager",
            self.manager
        )

        self.registry.register(
            "developer",
            self.developer
        )

        self.registry.register(
            "backend",
            self.backend
        )

        self.registry.register(
            "code_generator",
            self.code_generator
        )

        self.registry.register(
            "research",
            self.research
        )

        self.registry.register(
            "content",
            self.content
        )

        self.registry.register(
            "data",
            self.data_analyst
        )

        self.registry.register(
            "document",
            self.document
        )

        self.registry.register(
            "communication",
            self.communication
        )

        self.registry.register(
            "tester",
            self.tester
        )

        self.registry.register(
            "debugger",
            self.debugger
        )

        self.registry.register(
            "code_reviewer",
            self.code_reviewer
        )

        self.registry.register(
            "code_fixer",
            self.code_fixer
        )

        # -------------------------------------------------
        # DISPLAY REGISTRY
        # -------------------------------------------------

        print(
            "[REGISTRY] Registered agents:",
            self.registry.list_agents(),
        )

        # -------------------------------------------------
        # CREATE ORCHESTRATOR
        # -------------------------------------------------

        self.orchestrator = AgentOrchestrator(
            self.registry
        )

    # -----------------------------------------------------
    # RUN WORKFLOW
    # -----------------------------------------------------

    def run(
        self,
        request: str,
        history: list | None = None,
        attachments: list | None = None,
        mode: str | None = None,
    ):
        """
        Start the dynamic CHORUS workflow.

        Parameters
        ----------
        request:
            Current user request.

        history:
            Recent conversation messages from the
            current chat session.

        attachments:
            Uploaded files associated with the current
            user request.

        mode:
            Optional frontend-selected execution mode.

        The attachment metadata is passed directly to
        the Orchestrator so specialized agents such as
        Data Analyst and Document Agent can access the
        uploaded files.
        """

        return self.orchestrator.run(
            request=request,
            history=history,
            attachments=attachments,
            mode=mode,
        )


# =========================================================
# APPLICATION HEADER
# =========================================================

def print_header():

    print()

    print("=" * 64)
    print("                 MULTI-AGENT AI EMPLOYEE")
    print("=" * 64)

    print()

    print(
        "  Intelligent Role-Based AI Agent System"
    )

    print()

    print("  Available Agents:")

    print(
        "  Manager • Developer • Backend"
    )

    print(
        "  Code Generator • Research • Content"
    )

    print(
        "  Data Analyst • Document • Communication"
    )

    print(
        "  Tester • Debugger • Code Reviewer • Code Fixer"
    )

    print()

    print("-" * 64)


# =========================================================
# MAIN APPLICATION
# =========================================================

def main():

    print_header()

    # -----------------------------------------------------
    # GET USER REQUEST
    # -----------------------------------------------------

    print()
    print("USER REQUEST")
    print("-" * 64)

    request = input(
        "What do you want your AI Employee to do?\n> "
    ).strip()

    # -----------------------------------------------------
    # VALIDATE REQUEST
    # -----------------------------------------------------

    if not request:

        print()

        print("=" * 64)
        print(" ERROR")
        print("=" * 64)

        print()

        print(
            "No request was provided."
        )

        print()

        return

    # -----------------------------------------------------
    # DISPLAY REQUEST
    # -----------------------------------------------------

    print()

    print("-" * 64)
    print("REQUEST RECEIVED")
    print("-" * 64)

    print(request)

    print()

    print(
        "Starting AI Employee..."
    )

    print()

    # -----------------------------------------------------
    # CREATE WORKFLOW
    # -----------------------------------------------------

    workflow = MultiAgentWorkflow()

    # -----------------------------------------------------
    # EXECUTE WORKFLOW
    # -----------------------------------------------------

    try:

        result = workflow.run(
            request=request,
            history=[],
            attachments=[],
            mode=None,
        )

    except Exception as error:

        print()

        print("=" * 64)
        print(" WORKFLOW ERROR")
        print("=" * 64)

        print()

        print(error)

        print()

        return

    # -----------------------------------------------------
    # FINAL RESPONSE
    # -----------------------------------------------------

    print()

    print("=" * 64)
    print(" FINAL RESPONSE")
    print("=" * 64)

    print()

    if isinstance(result, dict):

        final_response = result.get(
            "final_response"
        )

    else:

        final_response = result

    if final_response:

        print(
            str(final_response).strip()
        )

    else:

        print(
            "No final response was generated."
        )

    print()


# =========================================================
# APPLICATION ENTRY POINT
# =========================================================

if __name__ == "__main__":
    main()