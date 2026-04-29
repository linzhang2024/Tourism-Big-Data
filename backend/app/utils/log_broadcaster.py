import logging
import json
import asyncio
import threading
from typing import Set, Optional
from fastapi import WebSocket
from datetime import datetime


class LogBroadcaster:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._main_loop: Optional[asyncio.AbstractEventLoop] = None
        self._lock = threading.Lock()

    def set_main_loop(self, loop: asyncio.AbstractEventLoop):
        with self._lock:
            self._main_loop = loop
        logging.info(f"[日志广播] 主线程事件循环已设置: {loop}")

    def get_main_loop(self) -> Optional[asyncio.AbstractEventLoop]:
        with self._lock:
            return self._main_loop

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logging.info("[日志广播] 新的 WebSocket 连接已建立")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logging.info("[日志广播] WebSocket 连接已断开")

    async def broadcast(self, message: str):
        disconnected = set()
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                disconnected.add(connection)
        
        for conn in disconnected:
            self.disconnect(conn)

    def broadcast_threadsafe(self, message: str):
        loop = self.get_main_loop()
        if loop is None:
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                try:
                    loop = asyncio.get_event_loop()
                except RuntimeError:
                    logging.warning("[日志广播] 无法获取事件循环，跳过广播")
                    return

        if loop.is_running():
            if threading.current_thread() is threading.main_thread():
                asyncio.create_task(self.broadcast(message))
            else:
                asyncio.run_coroutine_threadsafe(self.broadcast(message), loop)


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
            
            message = json.dumps(log_entry, ensure_ascii=False)
            self.broadcaster.broadcast_threadsafe(message)
        except Exception as e:
            logging.debug(f"[日志广播] emit 错误: {e}")
            self.handleError(record)


def setup_websocket_logging():
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = None
    
    if loop:
        log_broadcaster.set_main_loop(loop)
    
    root_logger = logging.getLogger()
    handler = WebSocketLogHandler(log_broadcaster)
    
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    
    root_logger.addHandler(handler)
    logging.info("[日志广播] WebSocket 日志处理器已初始化")
