await prisma.role.createMany({
  data: [
    { name: 'Admin' },
    { name: 'Faculty' },
    { name: 'Registrar' },
    { name: 'Cashier' },
  ],
  skipDuplicates: true
});
await prisma.user.createMany({
  data: [
    {
      UserID: '2023-0001',
      FirstName: 'John',
      LastName: 'Doe',
      Email: '