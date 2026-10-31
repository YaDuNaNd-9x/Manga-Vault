from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models.user import UserRegister, UserLogin, UserResponse, TokenResponse
from database import users_collection
from auth import hash_password, verify_password, create_access_token, decode_access_token
from datetime import timedelta
from dotenv import load_dotenv
from bson import ObjectId
import os

load_dotenv()

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    existing_user = await users_collection.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    existing_username = await users_collection.find_one({"username": user_data.username})
    if existing_username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")

    hashed_pw = hash_password(user_data.password)
    new_user = {
        "username": user_data.username,
        "email": user_data.email,
        "hashed_password": hashed_pw,
        "bio": None,
        "avatar_url": None,
        "banner_url": None,
    }

    result = await users_collection.insert_one(new_user)
    user_id = str(result.inserted_id)

    access_token = create_access_token(
        data={"sub": user_id},
        expires_delta=timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES")))
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user_id,
            username=user_data.username,
            email=user_data.email
        )
    )


@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    user = await users_collection.find_one({"email": user_data.email})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    user_id = str(user["_id"])

    access_token = create_access_token(
        data={"sub": user_id},
        expires_delta=timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES")))
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user_id,
            username=user["username"],
            email=user["email"],
            bio=user.get("bio"),
            avatar_url=user.get("avatar_url")
        )
    )


@router.get("/me", response_model=UserResponse)
async def get_me(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = payload.get("sub")
    user = await users_collection.find_one({"_id": ObjectId(user_id)})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(
        id=str(user["_id"]),
        username=user["username"],
        email=user["email"],
        bio=user.get("bio"),
        avatar_url=user.get("avatar_url"),
        banner_url=user.get("banner_url")
    )


@router.patch("/me/update")
async def update_profile(
    update_data: dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")

    allowed_fields = ["bio", "avatar_url", "banner_url"]
    update_fields = {k: v for k, v in update_data.items() if k in allowed_fields}

    if not update_fields:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_fields}
    )

    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    return UserResponse(
        id=str(user["_id"]),
        username=user["username"],
        email=user["email"],
        bio=user.get("bio"),
        avatar_url=user.get("avatar_url"),
        banner_url=user.get("banner_url")
    )