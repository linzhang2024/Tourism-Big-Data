import sys
import os

backend_dir = os.path.join(os.path.dirname(__file__), "backend")
sys.path.insert(0, backend_dir)

import uvicorn
from app.main import app

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )