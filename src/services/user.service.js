function createUserService(repository) {
  return {
    async getUserById(id) {
      return repository.findById(id);
    }
  };
}

module.exports = createUserService;
