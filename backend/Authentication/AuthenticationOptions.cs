using System.ComponentModel.DataAnnotations;

namespace Franchise.Api.Authentication;

public sealed class AuthenticationOptions
{
    public const string SectionName = "Authentication";

    [Required]
    public string Issuer { get; init; } = string.Empty;

    [Required]
    public string Audience { get; init; } = string.Empty;

    [MinLength(32)]
    public string SigningKey { get; init; } = string.Empty;

    [Required]
    public string AdminUsername { get; init; } = string.Empty;

    [MinLength(16)]
    public string AdminPassword { get; init; } = string.Empty;

    [Range(1, 120)]
    public int TokenLifetimeMinutes { get; init; } = 30;
}
