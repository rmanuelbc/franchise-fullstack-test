using System.ComponentModel.DataAnnotations;

namespace Franchise.Api.DTOs;

public record CreateProductDto(
    [Required(ErrorMessage = "Product name is required.")]
    [MinLength(2, ErrorMessage = "Product name must be at least 2 characters long.")]
    string Name,

    [Range(0, int.MaxValue, ErrorMessage = "Stock cannot be negative.")]
    int Stock
);

public record UpdateStockDto(
    [Range(0, int.MaxValue, ErrorMessage = "Stock cannot be negative.")]
    int Stock
);

public record UpdateProductNameDto(
    [Required(ErrorMessage = "Product name is required.")]
    [MinLength(2, ErrorMessage = "Product name must be at least 2 characters long.")]
    string Name
);

public sealed record LoginRequestDto(
    [Required]
    string Username,

    [Required]
    string Password
);

public sealed record LoginResponseDto(string AccessToken, DateTimeOffset ExpiresAtUtc);

public record ProductResponseDto(int Id, int BranchId, string Name, int Stock);
