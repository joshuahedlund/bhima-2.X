/* global element, by */
/* eslint class-methods-use-this:off */

/**
 * This class is represents an accountReference page in term of structure and
 * behaviour so it is a accountReference page object
 */

const GridRow = require('../shared/GridRow');

class AccountReferencePage {

  constructor() {
    this.grid = element(by.id('account-reference-grid'));
    this.createBtn = element(by.css('[data-method="create"]'));
  }

  count() {
    return this.grid
      .$('.ui-grid-render-container-body')
      .all(by.repeater('(rowRenderIndex, row) in rowContainer.renderedRows track by $index'))
      .count();
  }

  create() {
    return this.createBtn.click();
  }

  update(reference) {
    const row = new GridRow(reference);
    row.dropdown().click();
    row.edit().click();
  }

  remove(reference) {
    const row = new GridRow(reference);
    row.dropdown().click();
    row.remove().click();
  }
}

module.exports = AccountReferencePage;
