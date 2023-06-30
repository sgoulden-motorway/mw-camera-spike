describe("smoke tests", () => {
  it("should allow you to make a note", () => {
    cy.visitAndCheck("/");

    cy.findByText("Hello World!");
  });
});
