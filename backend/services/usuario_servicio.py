from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.core.security import verify_password, hash_password
from backend.db.models.usuario import Usuario
from backend.db.repositories.usuario_repo import UsuarioRepository
from backend.api.v1.schemas.usuario import UsuarioCreateDB, UsuarioUpdateDB


class UserService:
    def __init__(self, db: AsyncSession):
        self.repo = UsuarioRepository(db)

    async def create_user(self, user_in: UsuarioCreateDB) -> Usuario:
        # Verify if the email is already registered 
        existing_user = await self.repo.get_by_email(user_in.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered."
            )

        # Create a new Usuario instance (Note: In the auth phase, hashing will be added with Passlib/Bcrypt) 
        new_user = Usuario(
            email=user_in.email,
            hashed_password=hash_password(user_in.hashed_password),
            full_name=user_in.full_name,
            is_active=user_in.is_active
        )

        return await self.repo.create(new_user)

    async def get_users(self, skip: int = 0, limit: int = 100) -> List[Usuario]:
        return await self.repo.get_all(skip=skip, limit=limit)

    async def get_user_by_id(self, user_id: int) -> Usuario:
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        return user

    async def authenticate_user(self, email: str, password: str) -> Usuario | None:
        """Authenticate a user by email and password."""
        user = await self.repo.get_by_email(email)

        if not user:
            return None
        
        if not verify_password(password, user.hashed_password):
            return None
            
        return user


    async def delete_user_by_id(self, user_id: int) -> None:
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        await self.repo.delete(user)