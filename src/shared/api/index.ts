// Shared API - Public Exports
// FSD: shared/api

export { httpClient, tokenStorage, ApiError } from './http';
export { authApi } from './auth';
export type { User, Tokens, LoginDto, RegisterDto } from './auth';
// Note: tradesApi moved to entities/trade/api (FSD compliance)
export { canvasApi, generateThumbnail, createEmptyCanvasData } from './canvas';
export type {
    CreateCanvasDto,
    UpdateCanvasDto,
    CanvasData,
    CanvasListItem,
    CanvasInitialData,
    TransformState,
} from './canvas';
