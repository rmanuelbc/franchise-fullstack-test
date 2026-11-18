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

public record ProductResponseDto(int Id, int BranchId, string Name, int Stock);
