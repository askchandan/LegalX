from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
import asyncio
import httpx
import textwrap



# ---- FastAPI setup ----
app = FastAPI(title="Offline RAG API (Chroma + Qwen via Ollama)-Legal X")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request model
class PromptRequest(BaseModel):
    prompt: str

# Generation and retrieval parameters (backend-controlled)
TEMPERATURE = 0.0
TOP_P = 0.9
REPEAT_PENALTY = 1.1
MAX_TOKENS = 500
TOP_K = 3# <--- Fixed top_k value for similarity search

# Globals
vector_store = None
MAX_CONTEXT_LENGTH = 800  # Maximum context length for the model 

@app.on_event("startup")
async def load_vector_store():
    global vector_store
    print("[Startup] Loading embeddings & vector store...")
    embeddings = HuggingFaceEmbeddings(model_name="./all-MiniLM-L6-v2")
    vector_store = Chroma(
        persist_directory="chroma_store",
        embedding_function=embeddings
    )
    print("[Startup] Vector store ready.")


@app.post("/generate", response_model=Dict[str, object])
async def generate_response(request: PromptRequest):
    # Check if vector_store is initialized
    if vector_store is None:
        raise HTTPException(status_code=500, detail="Vector store not initialized. Check startup logs and chroma_store directory.")

    # Retrieve relevant documents with scores
    docs = await asyncio.to_thread(
        vector_store.similarity_search_with_score, request.prompt, TOP_K
    )

    if not docs:
        def sorry_stream():
            yield '{"response": "Sorry, I cannot answer that based on the available documents.", "context_sources": []}'
        return StreamingResponse(sorry_stream(), media_type="application/json")

    # Concatenate context
    context = "\n\n".join([doc[0].page_content for doc in docs])
    if len(context) > MAX_CONTEXT_LENGTH:
        context = context[:MAX_CONTEXT_LENGTH]

    prompt = textwrap.dedent(f"""
        You are a legal assistant specialized in Indian law.

    Your task is to answer legal questions accurately and clearly based on the provided legal documents, which may include Acts, Sections, Penalties, Case Laws, Procedures, and Notifications from Indian law.

    Follow these rules:

    1. Always assume the user is referring to Indian law unless stated otherwise.

    2. Use only the information given in the context.  
    Do **not** guess, assume, or generate answers outside the provided legal content.  
    If the answer is not present, respond with:  
    **“Sorry, I cannot answer that based on the available legal documents.”**

    3. When answering:
    Be concise and factual (1-3 sentences).  
    Mention the relevant **Act name**, **Section number**, and **penalty or procedure**, if available.  
    Use formal, neutral tone. Do not offer personal opinions or interpretations.

    4. If asked whether something is legal, allowed, punishable, or available:
    Start your answer with “Yes,” or “No,” followed by a short explanation based on the context.

    5. If multiple questions are asked, answer each one briefly and clearly.

    6. For casual inputs (hello, namaste, thanks):
     Respond politely and briefly.

    Never give legal advice, recommendations, or personal interpretations.  
    Never generate content not found in the context.

---
[Context Starts]
{context}
[Context Ends]

Question: {request.prompt}

Answer:
    """)

    async def stream_chunks():
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": "qwen3:0.6b",
                    "prompt": prompt,
                    "stream": True,
                    "temperature": TEMPERATURE,
                    "top_p": TOP_P,
                    "repeat_penalty": REPEAT_PENALTY,
                    "max_tokens": MAX_TOKENS
                },
                timeout=120.0
            )

            if response.status_code != 200:
                yield '{"error": "Ollama model error."}'
                return

            import json as _json
            buffer = ""
            in_think = False
            think_buffer = ""
            answer_started = False
            async for chunk in response.aiter_lines():
                if chunk:
                    try:
                        data = _json.loads(chunk)
                        if 'response' in data:
                            buffer += data['response']
                            while True:
                                think_start = buffer.find('<think>')
                                think_end = buffer.find('</think>')
                                if not in_think and think_start != -1:
                                    in_think = True
                                    buffer = buffer[think_start+7:]
                                if in_think and think_end != -1:
                                    think_buffer += buffer[:think_end]
                                    yield f'THINK:{think_buffer.strip()}'
                                    buffer = buffer[think_end+8:]
                                    in_think = False
                                    think_buffer = ""
                                    answer_started = True
                                elif in_think:
                                    think_buffer += buffer
                                    buffer = ""
                                    break
                                elif answer_started and buffer:
                                    yield f'ANSWER:{buffer}'
                                    buffer = ""
                                    break
                                else:
                                    break
                    except Exception:
                        pass

    return StreamingResponse(stream_chunks(), media_type="text/plain")

@app.get("/health")
async def health():
    return {"status": "healthy" if vector_store else "unhealthy"}

