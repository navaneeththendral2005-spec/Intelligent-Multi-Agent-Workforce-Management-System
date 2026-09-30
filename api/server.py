from pathlib import Path
from uuid import uuid4
import shutil

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from main import MultiAgentWorkflow


# =========================================================
# CHORUS API
# =========================================================

app = FastAPI(
    title="CHORUS API",
    description="API for the CHORUS Multi-Agent AI Employee",
    version="1.0.0",
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# CONFIGURATION
# =========================================================

MAX_HISTORY_MESSAGES = 12

BASE_DIR = Path(__file__).resolve().parent.parent

GENERATED_DOCUMENTS_DIR = (
    BASE_DIR / "generated_documents"
)

# Uploaded user files are stored separately from generated files.
UPLOADS_DIR = (
    BASE_DIR / "uploads"
)

API_BASE_URL = "http://127.0.0.1:8000"


# Create required directories.
GENERATED_DOCUMENTS_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

UPLOADS_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# =========================================================
# UPLOAD CONFIGURATION
# =========================================================

ALLOWED_UPLOAD_EXTENSIONS = {
    ".csv",
    ".xlsx",
    ".xls",
    ".pdf",
    ".doc",
    ".docx",
    ".txt",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
}

MAX_UPLOAD_SIZE = 25 * 1024 * 1024  # 25 MB


# =========================================================
# REQUEST / RESPONSE MODELS
# =========================================================

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatAttachment(BaseModel):
    id: str | None = None
    file_id: str | None = None

    filename: str = ""
    original_name: str = ""

    content_type: str = ""
    size: int = 0

    file_path: str = ""
    path: str | None = None
    stored_path: str | None = None


class ChatRequest(BaseModel):
    message: str

    history: list[ChatMessage] = Field(
        default_factory=list
    )

    attachments: list[ChatAttachment] = Field(
        default_factory=list
    )

    attachment: ChatAttachment | None = None

    mode: str | None = None


# =========================================================
# UPLOAD RESPONSE
# =========================================================

class UploadResponse(BaseModel):
    success: bool

    id: str
    file_id: str

    filename: str
    original_name: str

    content_type: str
    size: int

    file_path: str


# =========================================================
# EMAIL MODELS
# =========================================================

class EmailAction(BaseModel):
    status: str
    action: str
    platform: str = "gmail"

    to: str = ""
    cc: str | None = None
    bcc: str | None = None

    subject: str = ""
    message: str = ""

    attachments: list[str] = Field(
        default_factory=list
    )

    sent: bool = False


# =========================================================
# FILE MODEL
# =========================================================

class FileAction(BaseModel):
    filename: str
    file_type: str
    download_url: str
    size: int


# =========================================================
# CHAT RESPONSE
# =========================================================

class ChatResponse(BaseModel):
    success: bool
    response: str

    email_action: EmailAction | None = None

    file_action: FileAction | None = None


# =========================================================
# SEND EMAIL REQUEST
# =========================================================

class SendEmailRequest(BaseModel):
    platform: str = "gmail"

    to: str
    cc: str | None = None
    bcc: str | None = None

    subject: str
    message: str

    attachments: list[str] = Field(
        default_factory=list
    )


# =========================================================
# SEND EMAIL RESPONSE
# =========================================================

class SendEmailResponse(BaseModel):
    success: bool
    status: str
    platform: str

    to: str
    subject: str

    sent: bool
    message_id: str | None = None

    message_text: str = ""


# =========================================================
# WORKFLOW
# =========================================================

workflow = MultiAgentWorkflow()


# =========================================================
# EMAIL ACTION EXTRACTION
# =========================================================

def extract_email_action(value):
    """
    Detect an email action regardless of whether the
    Communication Agent returns it directly or wraps it
    inside another dictionary.
    """

    if not isinstance(value, dict):
        return None

    # -----------------------------------------------------
    # DIRECT EMAIL ACTION
    # -----------------------------------------------------

    if (
        value.get("action") == "send_email"
        and (
            value.get("status")
            in {
                "approval_required",
                "draft",
                "pending_approval",
            }
        )
    ):
        try:
            return EmailAction(
                status=value.get(
                    "status",
                    "approval_required",
                ),
                action="send_email",
                platform=value.get(
                    "platform",
                    "gmail",
                ),
                to=value.get(
                    "to",
                    "",
                ),
                cc=value.get("cc"),
                bcc=value.get("bcc"),
                subject=value.get(
                    "subject",
                    "",
                ),
                message=value.get(
                    "message",
                    "",
                ),
                attachments=value.get(
                    "attachments",
                    [],
                ) or [],
                sent=bool(
                    value.get(
                        "sent",
                        False,
                    )
                ),
            )

        except Exception as exc:
            print(
                "[CHORUS] Email action parsing error:",
                exc,
            )

    # -----------------------------------------------------
    # NESTED email_action
    # -----------------------------------------------------

    nested = value.get(
        "email_action"
    )

    if isinstance(
        nested,
        dict,
    ):
        detected = extract_email_action(
            nested
        )

        if detected:
            return detected

    # -----------------------------------------------------
    # NESTED email
    # -----------------------------------------------------

    nested = value.get(
        "email"
    )

    if isinstance(
        nested,
        dict,
    ):
        detected = extract_email_action(
            {
                **nested,
                "status": nested.get(
                    "status",
                    value.get(
                        "status",
                        "approval_required",
                    ),
                ),
                "action": nested.get(
                    "action",
                    "send_email",
                ),
            }
        )

        if detected:
            return detected

    # -----------------------------------------------------
    # TYPE = EMAIL
    # -----------------------------------------------------

    if (
        str(
            value.get(
                "type",
                "",
            )
        ).lower()
        == "email"
    ):
        try:
            return EmailAction(
                status=value.get(
                    "status",
                    "approval_required",
                ),
                action="send_email",
                platform=value.get(
                    "platform",
                    "gmail",
                ),
                to=value.get(
                    "to",
                    "",
                ),
                cc=value.get("cc"),
                bcc=value.get("bcc"),
                subject=value.get(
                    "subject",
                    "",
                ),
                message=value.get(
                    "message",
                    value.get(
                        "content",
                        "",
                    ),
                ),
                attachments=value.get(
                    "attachments",
                    [],
                ) or [],
                sent=bool(
                    value.get(
                        "sent",
                        False,
                    )
                ),
            )

        except Exception as exc:
            print(
                "[CHORUS] Email type parsing error:",
                exc,
            )

    return None


# =========================================================
# FILE ACTION EXTRACTION
# =========================================================

def extract_file_action(value):
    """
    Extract generated-file metadata from an agent result.
    """

    if not isinstance(
        value,
        dict,
    ):
        return None

    if value.get("type") != "file":
        return None

    file_data = value.get("file")

    if not isinstance(
        file_data,
        dict,
    ):
        return None

    filename = file_data.get(
        "filename"
    )

    if not filename:
        return None

    file_type = str(
        file_data.get(
            "file_type",
            Path(filename).suffix.lstrip("."),
        )
    )

    size = int(
        file_data.get(
            "size",
            0,
        )
    )

    return FileAction(
        filename=str(filename),
        file_type=file_type,
        download_url=(
            f"{API_BASE_URL}"
            f"/api/files/"
            f"{filename}"
        ),
        size=size,
    )


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/api/health")
def health_check():

    return {
        "status": "ok",
        "service": "CHORUS API",
    }


# =========================================================
# FILE UPLOAD
# =========================================================

@app.post(
    "/api/upload",
    response_model=UploadResponse,
)
async def upload_file(
    file: UploadFile = File(...),
):
    """
    Upload a user file for use by CHORUS agents.

    The uploaded file is stored locally in the project's
    uploads directory.

    The returned file_path is passed through the chat request
    to agents such as Data Analyst and Document Agent.
    """

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file has no filename.",
        )

    original_name = Path(
        file.filename
    ).name

    extension = Path(
        original_name
    ).suffix.lower()

    if extension not in ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type: {extension or 'unknown'}. "
                "Supported types are CSV, Excel, PDF, DOC, DOCX, "
                "TXT, PNG, JPG, JPEG and WEBP."
            ),
        )

    file_id = uuid4().hex

    safe_stem = Path(
        original_name
    ).stem

    # Remove characters that could make the generated
    # filename problematic.
    safe_stem = "".join(
        character
        if (
            character.isalnum()
            or character in (
                "-",
                "_",
                " ",
            )
        )
        else "_"
        for character in safe_stem
    ).strip()

    if not safe_stem:
        safe_stem = "uploaded_file"

    stored_filename = (
        f"{file_id}_{safe_stem}{extension}"
    )

    destination = (
        UPLOADS_DIR
        / stored_filename
    )

    total_size = 0

    try:

        with destination.open(
            "wb"
        ) as buffer:

            while True:

                chunk = await file.read(
                    1024 * 1024
                )

                if not chunk:
                    break

                total_size += len(chunk)

                if total_size > MAX_UPLOAD_SIZE:
                    buffer.close()

                    if destination.exists():
                        destination.unlink()

                    raise HTTPException(
                        status_code=413,
                        detail=(
                            "Uploaded file is too large. "
                            "Maximum allowed size is 25 MB."
                        ),
                    )

                buffer.write(chunk)

    except HTTPException:
        raise

    except Exception as exc:

        if destination.exists():
            destination.unlink()

        print(
            "[CHORUS UPLOAD ERROR]",
            exc,
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to save uploaded file: "
                f"{exc}"
            ),
        )

    finally:
        await file.close()

    resolved_path = destination.resolve()

    print(
        "[CHORUS] File uploaded:",
        original_name,
    )

    print(
        "[CHORUS] Stored at:",
        resolved_path,
    )

    return UploadResponse(
        success=True,
        id=file_id,
        file_id=file_id,
        filename=stored_filename,
        original_name=original_name,
        content_type=(
            file.content_type
            or "application/octet-stream"
        ),
        size=total_size,
        file_path=str(
            resolved_path
        ),
    )


# =========================================================
# FILE DOWNLOAD
# =========================================================

@app.get(
    "/api/files/{filename}",
    name="download_generated_file",
)
def download_generated_file(
    filename: str,
):
    """
    Download a file generated by CHORUS.
    """

    requested_name = Path(
        filename
    ).name

    if requested_name != filename:
        raise HTTPException(
            status_code=400,
            detail="Invalid filename.",
        )

    file_path = (
        GENERATED_DOCUMENTS_DIR
        / requested_name
    ).resolve()

    generated_dir = (
        GENERATED_DOCUMENTS_DIR.resolve()
    )

    try:
        file_path.relative_to(
            generated_dir
        )

    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid file path.",
        )

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Generated file was not found.",
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=400,
            detail="Requested path is not a file.",
        )

    return FileResponse(
        path=str(file_path),
        filename=file_path.name,
        media_type="application/octet-stream",
    )


# =========================================================
# CHAT
# =========================================================

@app.post(
    "/api/chat",
    response_model=ChatResponse,
)
def chat(
    request: ChatRequest,
):

    message = request.message.strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty.",
        )

    # -----------------------------------------------------
    # LIMIT HISTORY
    # -----------------------------------------------------

    history = request.history[
        -MAX_HISTORY_MESSAGES:
    ]

    # -----------------------------------------------------
    # CONVERT HISTORY
    # -----------------------------------------------------

    history_data = []

    for item in history:

        content = item.content.strip()

        if not content:
            continue

        role = (
            item.role
            .lower()
            .strip()
        )

        if role not in {
            "user",
            "agent",
            "assistant",
        }:
            role = "assistant"

        history_data.append(
            {
                "role": role,
                "content": content,
            }
        )

    # -----------------------------------------------------
    # NORMALIZE ATTACHMENTS
    # -----------------------------------------------------

    attachments = []

    for attachment in request.attachments:

        attachment_data = (
            attachment.model_dump()
        )

        # Ensure the orchestrator can always find the
        # actual stored path.
        if not attachment_data.get(
            "file_path"
        ):
            attachment_data["file_path"] = (
                attachment_data.get("path")
                or attachment_data.get("stored_path")
                or ""
            )

        attachments.append(
            attachment_data
        )

    # Support the singular attachment field too.
    if request.attachment is not None:

        singular = (
            request.attachment.model_dump()
        )

        if not singular.get(
            "file_path"
        ):
            singular["file_path"] = (
                singular.get("path")
                or singular.get("stored_path")
                or ""
            )

        # Avoid duplicating the same attachment.
        singular_id = (
            singular.get("id")
            or singular.get("file_id")
        )

        existing_ids = {
            item.get("id")
            or item.get("file_id")
            for item in attachments
        }

        if singular_id not in existing_ids:
            attachments.append(
                singular
            )

    # =====================================================
    # RUN CHORUS
    # =====================================================

    try:

        print()
        print(
            "[CHORUS API] Processing request..."
        )

        if attachments:
            print(
                "[CHORUS API] Attachments:",
                len(attachments),
            )

            for attachment in attachments:
                print(
                    "[CHORUS API] File:",
                    attachment.get(
                        "original_name"
                    )
                    or attachment.get(
                        "filename"
                    ),
                )

                print(
                    "[CHORUS API] Path:",
                    attachment.get(
                        "file_path"
                    ),
                )

        result = workflow.run(
            request=message,
            history=history_data,
            attachments=attachments,
            mode=request.mode,
        )

        email_action = None
        file_action = None
        workflow_success = True

        response_text = ""

        # =================================================
        # STRUCTURED WORKFLOW RESULT
        # =================================================

        if isinstance(
            result,
            dict,
        ):

            workflow_success = result.get(
                "success",
                True,
            ) is not False

            response_text = str(
                result.get(
                    "research_response",
                )
                or result.get(
                    "final_response",
                    "",
                )
            ).strip()

            # =============================================
            # DIRECT TOP-LEVEL EMAIL ACTION
            # =============================================

            email_action = (
                extract_email_action(
                    result.get(
                        "email_action"
                    )
                )
            )

            # =============================================
            # DIRECT TOP-LEVEL FILE ACTION
            # =============================================

            file_action = (
                extract_file_action(
                    result.get(
                        "file_action"
                    )
                )
            )

            results = result.get(
                "results",
                {},
            )

            # =============================================
            # PROCESS AGENT RESULTS
            # =============================================

            if isinstance(
                results,
                dict,
            ):

                normal_results = []

                for value in results.values():

                    # -------------------------------------
                    # EMAIL
                    # -------------------------------------

                    if email_action is None:

                        detected_email = (
                            extract_email_action(
                                value
                            )
                        )

                        if detected_email:

                            email_action = (
                                detected_email
                            )

                            print(
                                "[CHORUS] Email action detected."
                            )

                            continue

                    # -------------------------------------
                    # FILE
                    # -------------------------------------

                    if file_action is None:

                        detected_file = (
                            extract_file_action(
                                value
                            )
                        )

                        if detected_file:

                            file_action = (
                                detected_file
                            )

                            print(
                                "[CHORUS] File action detected:",
                                detected_file.filename,
                            )

                            if (
                                isinstance(
                                    value,
                                    dict,
                                )
                                and value.get(
                                    "content"
                                )
                            ):

                                normal_results.append(
                                    str(
                                        value[
                                            "content"
                                        ]
                                    ).strip()
                                )

                            continue

                    # -------------------------------------
                    # NORMAL TEXT
                    # -------------------------------------

                    if isinstance(
                        value,
                        dict,
                    ):
                        continue

                    if value:

                        normal_results.append(
                            str(
                                value
                            ).strip()
                        )

                # =========================================
                # FALLBACK RESPONSE
                # =========================================

                if not response_text:

                    response_text = (
                        "\n\n".join(
                            item
                            for item in normal_results
                            if item
                        )
                    )

        else:

            response_text = str(
                result
            ).strip()

        # =================================================
        # EMAIL RESPONSE
        # =================================================

        if email_action is not None:

            response_text = (
                "I've prepared the email below. "
                "Review the details and confirm "
                "when you're ready to send it."
            )

        # =================================================
        # FILE RESPONSE
        # =================================================

        elif file_action is not None and not response_text:

            response_text = (
                "Your document is ready."
            )

        # =================================================
        # EMPTY RESPONSE
        # =================================================

        if not response_text:

            response_text = (
                "I couldn't generate a response "
                "for that request."
            )

        print(
            "[CHORUS API] Response prepared."
        )

        return ChatResponse(
            success=workflow_success,
            response=response_text,
            email_action=email_action,
            file_action=file_action,
        )

    # =====================================================
    # ERROR HANDLING
    # =====================================================

    except HTTPException:
        raise

    except Exception as exc:

        print(
            f"[CHORUS API ERROR] {exc}"
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "CHORUS failed to process "
                f"the request: {exc}"
            ),
        )


# =========================================================
# SEND EMAIL
# =========================================================

@app.post(
    "/api/send-email",
    response_model=SendEmailResponse,
)
def send_email(
    request: SendEmailRequest,
):

    platform = (
        request.platform
        .lower()
        .strip()
    )

    if platform != "gmail":

        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported email platform: "
                f"{platform}"
            ),
        )

    if not request.to.strip():

        raise HTTPException(
            status_code=400,
            detail="Recipient email is required.",
        )

    if not request.subject.strip():

        raise HTTPException(
            status_code=400,
            detail="Email subject is required.",
        )

    if not request.message.strip():

        raise HTTPException(
            status_code=400,
            detail="Email content is required.",
        )

    try:

        result = (
            workflow.orchestrator.send_approved_email(
                {
                    "platform": platform,
                    "to": request.to.strip(),
                    "cc": request.cc,
                    "bcc": request.bcc,
                    "subject": request.subject.strip(),
                    "message": request.message.strip(),
                    "attachments": request.attachments,
                }
            )
        )

        if not isinstance(
            result,
            dict,
        ):

            result = {
                "status": "sent",
                "sent": True,
                "platform": platform,
                "to": request.to.strip(),
                "subject": request.subject.strip(),
                "message_text": str(result),
            }

        return SendEmailResponse(
            success=True,
            status=result.get(
                "status",
                "sent",
            ),
            platform=result.get(
                "platform",
                platform,
            ),
            to=result.get(
                "to",
                request.to,
            ),
            subject=result.get(
                "subject",
                request.subject,
            ),
            sent=bool(
                result.get(
                    "sent",
                    True,
                )
            ),
            message_id=result.get(
                "message_id"
            ),
            message_text=result.get(
                "message_text",
                "Email was successfully sent through Gmail.",
            ),
        )

    except Exception as exc:

        print(
            f"[CHORUS EMAIL ERROR] {exc}"
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "CHORUS could not send "
                f"the email: {exc}"
            ),
        )