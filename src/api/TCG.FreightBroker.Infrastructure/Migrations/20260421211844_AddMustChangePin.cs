using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TCG.FreightBroker.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMustChangePin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "MustChangePin",
                table: "AppUsers",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MustChangePin",
                table: "AppUsers");
        }
    }
}
