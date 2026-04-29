import logging
import json
from typing import Set
from fastapi import WebSocket
from datetime import datetime


class LogBroadcaster:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logging.info("[日志广播] 新的 WebSocket 连接已建立")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logging.info("[日志广播] WebSocket 连接已断开")

    async def broadcast(self, message: str):
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                disconnected.add(connection)
        
        for conn in disconnected:
            self.disconnect(conn)


log_broadcaster = LogBroadcaster()


class WebSocketLogHandler(logging.Handler):
    def __init__(self, broadcaster: LogBroadcaster):
        super().__init__()
        self.broadcaster = broadcaster
        self.setLevel(logging.INFO)

    def emit(self, record):
        try:
            log_entry = {
                "timestamp": datetime.fromtimestamp(record.created).isoformat(),
                "level": record.levelname,
                "logger": record.name,
                "message": record.getMessage(),
                "module": record.module,
                "function": record.funcName,
                "line": record.lineno
            }
            
            import asyncio
            message = json.dumps(log_entry, ensure_ascii=False)
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(self.broadcaster.broadcast(message))
        except Exception:
            self.handleError(record)


def setup_websocket_logging():
    root_logger = logging.getLogger()
    handler = WebSocketLogHandler(log_broadcaster)
    
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    
    root_logger.addHandler(handler)
    logging.info("[日志广播] WebSocket 日志处理器已初始化")
