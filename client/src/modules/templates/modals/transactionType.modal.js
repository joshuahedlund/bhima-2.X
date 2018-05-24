angular.module('bhima.controllers')
  .controller('TransactionTypeModalController', TransactionTypeModalController);

// dependencies injections
TransactionTypeModalController.$inject = [
  '$uibModalInstance', 'TransactionTypeService', 'NotifyService', 'data',
];

function TransactionTypeModalController(Instance, TransactionType, Notify, Data) {
  const vm = this;

  vm.isCreateState = Data.action === 'create';
  vm.isUpdateState = Data.action === 'edit';

  vm.types = [
    { label : 'VOUCHERS.SIMPLE.INCOME', value : 'income' },
    { label : 'VOUCHERS.SIMPLE.EXPENSE', value : 'expense' },
    { label : 'FORM.LABELS.OTHER', value : 'other' },
  ];

  vm.transactionType = {};

  // expose to the view
  vm.submit = submit;
  vm.close = Instance.close;

  /**
   * @function submit
   *
   * @description
   * Submits a new transaction type to the server.
   */
  function submit(form) {
    if (form.$invalid) {
      Notify.danger('FORM.ERRORS.HAS_ERRORS');
      return 0;
    }

    const transactionType = angular.copy(vm.transactionType);

    const promise = (vm.isCreateState) ?
      TransactionType.create(transactionType) :
      TransactionType.update(transactionType.id, transactionType);

    return promise
      .then(() => {
        Instance.close(true);
      })
      .catch(err => {
        Notify.handleError(err);
        Instance.close(false);
      });
  }

  function startup() {
    if (vm.isUpdateState && Data.identifier) {
      TransactionType.read(Data.identifier)
        .then(type => {
          vm.transactionType = type;
        })
        .catch(Notify.handleError);
    }
  }

  startup();
}
