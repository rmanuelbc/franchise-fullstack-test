using Franchise.Api.Data;
using Franchise.Api.DTOs;
using Franchise.Api.Models;
using Franchise.Api.Validation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Franchise.Api.Controllers;

[ApiController]
[Route("api")]
public class BranchesController : ControllerBase
{
    private readonly AppDbContext _context;

    public BranchesController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/franchises/{franchiseId}/branches
    [HttpGet("franchises/{franchiseId}/branches")]
    public async Task<ActionResult<IEnumerable<BranchResponseDto>>> GetByFranchise(int franchiseId)
    {
        var franchiseExists = await _context.Franchises.AnyAsync(f => f.Id == franchiseId);
        if (!franchiseExists)
            return NotFound(new { message = $"Franchise with ID {franchiseId} was not found." });

        var branches = await _context.Branches
            .Where(b => b.FranchiseId == franchiseId)
            .Select(b => new BranchResponseDto(b.Id, b.FranchiseId, b.Name))
            .ToListAsync();

        return Ok(branches);
    }

    // GET: api/branches/{branchId}
    [HttpGet("branches/{branchId}")]
    public async Task<ActionResult<BranchResponseDto>> GetById(int branchId)
    {
        var branch = await _context.Branches
            .Where(b => b.Id == branchId)
            .Select(b => new BranchResponseDto(b.Id, b.FranchiseId, b.Name))
            .FirstOrDefaultAsync();

        if (branch == null)
            return NotFound(new { message = $"Branch with ID {branchId} was not found." });

        return Ok(branch);
    }

    // POST: api/franchises/{franchiseId}/branches
    [HttpPost("franchises/{franchiseId}/branches")]
    public async Task<ActionResult<BranchResponseDto>> Create(int franchiseId, [FromBody] CreateBranchDto dto)
    {
        if (!NameValidation.IsValid(dto.Name))
            return BadRequest(new { message = "Branch name must contain at least 2 non-whitespace characters." });

        var franchiseExists = await _context.Franchises.AnyAsync(f => f.Id == franchiseId);
        if (!franchiseExists)
            return NotFound(new { message = $"Franchise with ID {franchiseId} was not found." });

        var branch = new Branch
        {
            Name = dto.Name.Trim(),
            FranchiseId = franchiseId
        };

        _context.Branches.Add(branch);
        await _context.SaveChangesAsync();

        var response = new BranchResponseDto(branch.Id, branch.FranchiseId, branch.Name);
        return CreatedAtAction(nameof(GetById), new { branchId = branch.Id }, response);
    }

    // PATCH: api/branches/{branchId}
    [HttpPatch("branches/{branchId}")]
    public async Task<ActionResult<BranchResponseDto>> UpdateName(int branchId, [FromBody] UpdateBranchDto dto)
    {
        var branch = await _context.Branches.FindAsync(branchId);
        if (branch == null)
            return NotFound(new { message = $"Branch with ID {branchId} was not found." });

        if (!NameValidation.IsValid(dto.Name))
            return BadRequest(new { message = "Branch name must contain at least 2 non-whitespace characters." });

        branch.Name = dto.Name.Trim();
        await _context.SaveChangesAsync();

        return Ok(new BranchResponseDto(branch.Id, branch.FranchiseId, branch.Name));
    }

    // DELETE: api/branches/{branchId}
    [HttpDelete("branches/{branchId}")]
    public async Task<IActionResult> Delete(int branchId)
    {
        var branch = await _context.Branches.FindAsync(branchId);
        if (branch == null)
            return NotFound(new { message = $"Branch with ID {branchId} was not found." });

        _context.Branches.Remove(branch);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // DELETE: api/branches/{branchId}/products/{productId}
    [HttpDelete("branches/{branchId}/products/{productId}")]
    public async Task<IActionResult> DeleteProduct(int branchId, int productId)
    {
        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == productId && p.BranchId == branchId);

        if (product == null)
            return NotFound(new { message = $"Product {productId} in branch {branchId} was not found." });

        _context.Products.Remove(product);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
