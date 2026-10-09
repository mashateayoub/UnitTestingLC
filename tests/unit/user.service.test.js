const createUserService = require('../../src/services/user.service');

describe('userService.getUserById', () => {
  let repository;
  let service;
  

  beforeEach(() => {
    repository = { findById: jest.fn() };
    service = createUserService(repository);
  });

  test('retourne l’utilisateur trouvé et appelle le repository une fois', async () => {
    // Arrange
    const user = { id: '42', name: 'Sara' };
    repository.findById.mockResolvedValue(user);
  
    // const user1 = { id: '43', name: 'Sara' };
    // repository.findById.mockResolvedValue(user1);
    // Act
    const result = await service.getUserById('42');

    // Assert
    expect(result).toEqual(user);
    expect(repository.findById).toHaveBeenCalledTimes(1);
    expect(repository.findById).toHaveBeenCalledWith('42');

  });
});
