import os
import ssl
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "")

# Convert postgres:// to postgresql+asyncpg:// for async support
if DATABASE_URL.startswith("postgresql://"):
    ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgres://"):
    ASYNC_DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
else:
    ASYNC_DATABASE_URL = DATABASE_URL

# Remove sslmode and channel_binding parameters as asyncpg handles SSL differently
import re
ASYNC_DATABASE_URL = re.sub(r'[?&]sslmode=[^&]*', '', ASYNC_DATABASE_URL)
ASYNC_DATABASE_URL = re.sub(r'[?&]channel_binding=[^&]*', '', ASYNC_DATABASE_URL)
# Clean up any leftover ? or & at the end
ASYNC_DATABASE_URL = re.sub(r'[?&]$', '', ASYNC_DATABASE_URL)

# Create SSL context for Neon
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# Create async engine with SSL
engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,  # Set to True for SQL debugging
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    connect_args={"ssl": ssl_context}
)

# Create async session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Base class for models
class Base(DeclarativeBase):
    pass

async def get_db():
    """Dependency to get database session"""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables created successfully")

async def close_db():
    """Close database connections"""
    await engine.dispose()
