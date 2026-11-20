using Franchise.Api.Controllers;
using Franchise.Api.Authentication;
using Franchise.Api.Data;
using Franchise.Api.DTOs;
using Franchise.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.IdentityModel.Tokens.Jwt;
using FranchiseEntity = Franchise.Api.Models.Franchise;

namespace Franchise.Api.Tests;

public class ProductsAndBranchesControllerTests
{
    [Fact]
    public async Task UpdateName_ChangesProductNameAndPreservesStock()
    {
        await using var database = await SqliteTestDatabase.CreateAsync();
        var product = await database.AddProductAsync("Old name", stock: 12);
        var controller = new ProductsController(database.Context);

        var result = await controller.UpdateName(product.Id, new UpdateProductNameDto("New name"));

        var response = Assert.IsType<OkObjectResult>(result.Result);
        var updatedProduct = Assert.IsType<ProductResponseDto>(response.Value);
        Assert.Equal("New name", updatedProduct.Name);
        Assert.Equal(12, updatedProduct.Stock);

        var storedProduct = await database.Context.Products
            .AsNoTracking()
            .SingleAsync(item => item.Id == product.Id);
        Assert.Equal("New name", storedProduct.Name);
    }

    [Fact]
    public async Task UpdateName_RejectsNamesShorterThanTwoCharactersAfterTrimming()
    {
        await using var database = await SqliteTestDatabase.CreateAsync();
        var product = await database.AddProductAsync("Original name", stock: 3);
        var controller = new ProductsController(database.Context);

        var result = await controller.UpdateName(product.Id, new UpdateProductNameDto("  "));

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal("Original name", (await database.Context.Products.FindAsync(product.Id))?.Name);
    }

    [Theory]
    [InlineData("  ")]
    [InlineData(" a ")]
    public async Task CreateProduct_RejectsNamesShorterThanTwoCharactersAfterTrimming(string name)
    {
        await using var database = await SqliteTestDatabase.CreateAsync();
        var product = await database.AddProductAsync("Existing product", stock: 1);
        var branchId = product.BranchId;
        var controller = new ProductsController(database.Context);

        var result = await controller.Create(branchId, new CreateProductDto(name, Stock: 2));

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal(1, await database.Context.Products.CountAsync());
    }

    [Fact]
    public async Task CreateFranchise_RejectsWhitespaceOnlyName()
    {
        await using var database = await SqliteTestDatabase.CreateAsync();
        var controller = new FranchisesController(database.Context);

        var result = await controller.Create(new CreateFranchiseDto("  "));

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Empty(await database.Context.Franchises.ToListAsync());
    }

    [Fact]
    public async Task CreateBranch_RejectsWhitespaceOnlyName()
    {
        await using var database = await SqliteTestDatabase.CreateAsync();
        var franchise = new FranchiseEntity { Name = "Test franchise" };
        database.Context.Franchises.Add(franchise);
        await database.Context.SaveChangesAsync();
        var controller = new BranchesController(database.Context);

        var result = await controller.Create(franchise.Id, new CreateBranchDto("  "));

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Empty(await database.Context.Branches.ToListAsync());
    }

    [Theory]
    [InlineData("  ")]
    [InlineData(" a ")]
    public async Task UpdateBranchName_RejectsNamesShorterThanTwoCharactersAfterTrimming(string name)
    {
        await using var database = await SqliteTestDatabase.CreateAsync();
        var product = await database.AddProductAsync("Existing product", stock: 1);
        var branch = await database.Context.Branches.FindAsync(product.BranchId);
        var controller = new BranchesController(database.Context);

        var result = await controller.UpdateName(branch!.Id, new UpdateBranchDto(name));

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal("Test branch", (await database.Context.Branches.FindAsync(branch.Id))?.Name);
    }

    [Theory]
    [InlineData("  ")]
    [InlineData(" a ")]
    public async Task UpdateFranchiseName_RejectsNamesShorterThanTwoCharactersAfterTrimming(string name)
    {
        await using var database = await SqliteTestDatabase.CreateAsync();
        var franchise = new FranchiseEntity { Name = "Existing franchise" };
        database.Context.Franchises.Add(franchise);
        await database.Context.SaveChangesAsync();
        var controller = new FranchisesController(database.Context);

        var result = await controller.UpdateName(franchise.Id, new UpdateFranchiseDto(name));

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal(
            "Existing franchise",
            (await database.Context.Franchises.FindAsync(franchise.Id))?.Name);
    }

    [Fact]
    public void AuthService_IssuesJwtOnlyForConfiguredAdminCredentials()
    {
        var service = CreateAuthService();

        var rejected = service.Login(new LoginRequestDto("admin", "incorrect-password"));
        var accepted = service.Login(new LoginRequestDto("admin", "strong-admin-password"));

        Assert.Null(rejected);
        Assert.NotNull(accepted);
        var token = new JwtSecurityTokenHandler().ReadJwtToken(accepted.AccessToken);
        Assert.Equal("Franchise.Api", token.Issuer);
        Assert.Equal("Franchise.Frontend", token.Audiences.Single());
        Assert.Equal("admin", token.Claims.Single(claim => claim.Type.EndsWith("/name")).Value);
    }

    [Fact]
    public async Task DeleteBranch_RemovesItsProductsAndKeepsItsFranchise()
    {
        await using var database = await SqliteTestDatabase.CreateAsync();
        var product = await database.AddProductAsync("Product to cascade", stock: 1);
        var branchId = product.BranchId;
        var franchiseId = (await database.Context.Branches.FindAsync(branchId))!.FranchiseId;
        var controller = new BranchesController(database.Context);

        var result = await controller.Delete(branchId);

        Assert.IsType<NoContentResult>(result);
        Assert.False(await database.Context.Branches.AnyAsync(branch => branch.Id == branchId));
        Assert.False(await database.Context.Products.AnyAsync(item => item.Id == product.Id));
        Assert.True(await database.Context.Franchises.AnyAsync(franchise => franchise.Id == franchiseId));
    }

    private static AuthService CreateAuthService() =>
        new(Options.Create(new AuthenticationOptions
        {
            Issuer = "Franchise.Api",
            Audience = "Franchise.Frontend",
            SigningKey = "test-signing-key-with-at-least-32-bytes",
            AdminUsername = "admin",
            AdminPassword = "strong-admin-password",
            TokenLifetimeMinutes = 30
        }));

    private sealed class SqliteTestDatabase : IAsyncDisposable
    {
        private readonly SqliteConnection _connection;

        private SqliteTestDatabase(SqliteConnection connection, AppDbContext context)
        {
            _connection = connection;
            Context = context;
        }

        public AppDbContext Context { get; }

        public static async Task<SqliteTestDatabase> CreateAsync()
        {
            var connection = new SqliteConnection("Data Source=:memory:");
            await connection.OpenAsync();

            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseSqlite(connection)
                .Options;
            var context = new AppDbContext(options);
            await context.Database.EnsureCreatedAsync();

            return new SqliteTestDatabase(connection, context);
        }

        public async Task<Product> AddProductAsync(string name, int stock)
        {
            var franchise = new FranchiseEntity { Name = "Test franchise" };
            var branch = new Branch { Name = "Test branch", Franchise = franchise };
            var product = new Product { Name = name, Stock = stock, Branch = branch };

            Context.Products.Add(product);
            await Context.SaveChangesAsync();

            return product;
        }

        public async ValueTask DisposeAsync()
        {
            await Context.DisposeAsync();
            await _connection.DisposeAsync();
        }
    }
}
