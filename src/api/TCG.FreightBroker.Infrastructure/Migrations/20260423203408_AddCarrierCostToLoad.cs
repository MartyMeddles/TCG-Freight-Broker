using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TCG.FreightBroker.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCarrierCostToLoad : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "CarrierCost",
                table: "Loads",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CarrierCost",
                table: "Loads");
        }
    }
}
