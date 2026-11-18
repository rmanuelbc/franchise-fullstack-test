using System.ComponentModel.DataAnnotations;

namespace Franchise.Api.DTOs;

public record CreateBranchDto(
    [Required(ErrorMessage = "Branch name is required.")]
    [MinLength(2, ErrorMessage = "Branch name must be at least 2 characters long.")]
    string Name
);

public record UpdateBranchDto(
    [Required(ErrorMessage = "Branch name is required.")]
    [MinLength(2, ErrorMessage = "Branch name must be at least 2 characters long.")]
    string Name
);

public record BranchResponseDto(int Id, int FranchiseId, string Name);
