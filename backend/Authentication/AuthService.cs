using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Franchise.Api.DTOs;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Franchise.Api.Authentication;

public sealed class AuthService : IAuthService
{
    private readonly AuthenticationOptions _options;

    public AuthService(IOptions<AuthenticationOptions> options)
    {
        _options = options.Value;
    }

    public LoginResponseDto? Login(LoginRequestDto request)
    {
        if (!AreEqual(request.Username, _options.AdminUsername) ||
            !AreEqual(request.Password, _options.AdminPassword))
        {
            return null;
        }

        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(_options.TokenLifetimeMinutes);
        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: [new Claim(ClaimTypes.Name, _options.AdminUsername)],
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);

        return new LoginResponseDto(new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }

    private static bool AreEqual(string input, string expected)
    {
        var inputHash = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        var expectedHash = SHA256.HashData(Encoding.UTF8.GetBytes(expected));
        return CryptographicOperations.FixedTimeEquals(inputHash, expectedHash);
    }
}
