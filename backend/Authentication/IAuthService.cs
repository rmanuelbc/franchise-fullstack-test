using Franchise.Api.DTOs;

namespace Franchise.Api.Authentication;

public interface IAuthService
{
    LoginResponseDto? Login(LoginRequestDto request);
}
