var chai = require('chai'),
    should = chai.should(),
    expect = chai.expect,
    _ = require('lodash'),
    xero = require('..'),
    util = require('util'),
    Browser = require('zombie');

process.on('uncaughtException', function(err) {
    console.log('uncaught', err)
})

var currentApp;

/**
 * Private Application Tests
 * 
 * Accounting API Tests covered:
 * - Accounts (GET, POST, PUT, DELETE)
 * - Invoices (GET, PUT, POST)
 * - Payments (GET, PUT, POST)
 * - BankTransactions (GET, POST, PUT)
 * - Attachments (GET, POST, PUT)
 * - BankTransfers (GET, PUT)
 * - Contacts (GET, PUT, POST)
 * - Items (GET, PUT, POST, DELETE)
 * - Journals (GET)
 * - Organisations (GET)
 * - Tracking Categories (GET, PUT, POST, DELETE)
 * - Users (GET)
 * 
 * Payroll Tests Covered
 * - Pay Items (GET, POST)
 * - Payroll Employees (GET, POST)
 * - Timesheets (GET, POST)
 */

var organisationCountry = "";

var privateConfigFile = "/Users/jordan.walsh/.xero/private_app_config.json";
var publicConfigFile = "/Users/jordan.walsh/.xero/public_app_config.json";

describe.skip('private application', function() {
    describe('create instance', function() {
        it('init instance and set options', function(done) {
            //This constructor looks in ~/.xero/config.json for settings
            currentApp = new xero.PrivateApplication(privateConfigFile);
            done();
        })
    });
});

describe('public application', function() {
    describe('create instance', function() {
        it('init instance and set options', function(done) {
            //This constructor looks in ~/.xero/config.json for settings
            currentApp = new xero.PublicApplication(publicConfigFile);
            done();
        })
    });

    describe('Get tokens', function() {

        var authoriseUrl = "";
        var requestToken = "";
        var requestSecret = "";
        var verifier = "";

        var accessToken = "";
        var accessSecret = "";


        it('user gets a token and builds the url', function(done) {
            currentApp.getRequestToken(function(err, token, secret) {
                    if (!err) {
                        authoriseUrl = currentApp.buildAuthorizeUrl(token);
                        requestToken = token;
                        requestSecret = secret;
                        console.log("URL: " + authoriseUrl);
                        console.log("token: " + requestToken);
                        console.log("secret: " + requestSecret);
                    } else {
                        throw err;
                    }
                })
                .then(function() {
                    done();
                }).fail(function(err) {
                    done(wrapError(err));
                });
        });

        describe('gets the request token from the url', function() {
            this.timeout(20000);
            var user_agent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_3) AppleWebKit/535.20 (KHTML, like Gecko) Chrome/19.0.1036.7';
            const browser = new Browser({
                userAgent: user_agent,
                waitFor: 20000,
                runScripts: false
            });

            browser.debug();

            before(function(done) {
                browser.visit(authoriseUrl, done);
            });

            describe('submits form', function() {
                this.timeout(20000);

                it('should login', function(done) {
                    browser
                        .fill('userName', '')
                        .fill('password', '')
                        .pressButton('Login', done);
                });

                it('should be successful', function(done) {
                    browser.assert.success();
                    done();
                });

                it('should see noscript page', function(done) {
                    browser.assert.text('title', 'Working...');
                    browser.document.forms[0].submit();
                    browser.wait().then(function() {
                        // just dump some debug data to see if we're on the right page
                        //console.log(browser.dump());
                        done();
                    });

                });

                it('should see application auth page', function(done) {
                    //console.log(browser.document.documentElement.innerHTML);
                    browser.assert.text('title', 'Xero | Authorise Application');
                    browser.select('select', '');
                    browser.pressButton("Allow access for 30 mins");
                    browser.wait().then(function() {
                        // just dump some debug data to see if we're on the right page
                        //console.log(browser.document.documentElement.innerHTML);
                        done();
                    });
                });

                it('should get a code to enter', function(done) {
                    browser.assert.text('title', 'Xero | Authorise Application');
                    verifier = browser.field('#pin-input').value;

                    expect(verifier).to.not.equal("");
                    expect(verifier).to.be.a('String');
                    done();
                });

            });
        });

        describe('swaps the request token for an access token', function() {
            this.timeout(20000);
            it('calls the access token method', function(done) {
                currentApp.getAccessToken(requestToken, requestSecret, verifier, function(err, accessToken, accessSecret, results) {

                        if (!err) {
                            this.accessToken = accessToken;
                            this.accessSecret = accessSecret;

                            console.log('accessToken: ' + this.accessToken);
                            console.log('accessSecret: ' + this.accessSecret);
                        } else {
                            throw err;
                        }
                    })
                    .then(function() {
                        done();
                    }).fail(function(err) {
                        done(wrapError(err));
                    });
            });

        });

        describe('set the access token and secret in the public application', function() {

            it('calls the setoptions method', function(done) {
                var options = {
                    accessToken: this.accessToken,
                    accessSecret: this.accessSecret
                };

                var updatedOptions = currentApp.setOptions(options);

                expect(updatedOptions.accessToken).to.equal(this.accessToken);
                expect(updatedOptions.accessSecret).to.equal(this.accessSecret);
                done();
            });

        })


    });
});


describe('regression tests', function() {
    describe('organisations', function() {
        it('get', function(done) {
            this.timeout(10000);
            currentApp.core.organisations.getOrganisation()
                .then(function(ret) {

                    var orgVersions = ["AU", "NZ", "GLOBAL", "UK", "US"];
                    expect(ret.Name).to.not.equal("");
                    expect(ret.Version).to.not.equal("");
                    expect(ret.Version).to.be.oneOf(orgVersions);

                    organisationCountry = ret.Version;

                    done();
                })
                .fail(function(err) {
                    done(wrapError(err));
                })
        })
    })

    describe('accounts', function() {

        //Accounts supporting data
        var accountClasses = ["ASSET", "EQUITY", "EXPENSE", "LIABILITY", "REVENUE"];
        var accountTypes = ["BANK", "CURRENT", "CURRLIAB", "DEPRECIATN", "DIRECTCOSTS", "EQUITY", "EXPENSE", "FIXED", "INVENTORY", "LIABILITY", "NONCURRENT", "OTHERINCOME", "OVERHEADS", "PREPAYMENT", "REVENUE", "SALES", "TERMLIAB", "PAYGLIABILITY", "SUPERANNUATIONEXPENSE", "SUPERANNUATIONLIABILITY", "WAGESEXPENSE", "WAGESPAYABLELIABILITY"];
        var accountStatusCodes = ["ACTIVE", "ARCHIVED"];
        var bankAccountTypes = ["BANK", "CREDITCARD", "PAYPAL"];

        it('GET ALL', function(done) {
            this.timeout(10000);
            currentApp.core.accounts.getAccounts()
                .then(function(accounts) {

                    accounts.forEach(function(account) {

                        //Fields required for POST / PUT

                        expect(account.Code).to.be.a('string');
                        expect(account.Code).to.have.length.below(11);

                        expect(account.Name).to.not.equal("");
                        expect(account.Name).to.be.a('string');

                        expect(account.Type).to.not.equal("");
                        expect(account.Type).to.be.oneOf(accountTypes);

                        if (account.Type === "BANK") {
                            expect(account.BankAccountType).to.be.a('string');
                            expect(account.BankAccountType).to.be.oneOf(bankAccountTypes);

                            expect(account.BankAccountNumber).to.be.a('string');
                            expect(account.BankAccountNumber).to.not.equal("");

                            if (account.CurrencyCode) {
                                expect(account.CurrencyCode).to.be.a('string');
                                expect(account.CurrencyCode).to.not.equal("");
                            }
                        }

                        expect(account.Status).to.be.a('string');
                        expect(account.Status).to.be.oneOf(accountStatusCodes);

                        //Description is an optional field, when not provided it should be undefined.
                        if (account.Description) {
                            expect(account.Description).to.be.a('string');
                            expect(account.Description).to.have.length.below(4001);
                        } else {
                            expect(account.Description).to.be.undefined;
                        }

                        expect(account.TaxType).to.be.a('string');
                        expect(account.TaxType).to.not.equal("");

                        expect(account.EnablePaymentsToAccount).to.be.a('boolean');
                        expect(account.EnablePaymentsToAccount).to.not.be.undefined;

                        expect(account.ShowInExpenseClaims).to.be.a('boolean');
                        expect(account.ShowInExpenseClaims).to.not.be.undefined;

                        //Fields returned in the GET
                        expect(account.AccountID).to.not.equal("");
                        expect(account.Class).to.be.oneOf(accountClasses);

                        if (account.SystemAccount) {
                            expect(account.SystemAccount).to.not.equal("");
                            expect(account.SystemAccount).to.be.a('string');
                        }

                        if (account.ReportingCode) {
                            expect(account.ReportingCode).to.not.equal("");
                            expect(account.ReportingCode).to.be.a('string');
                        }

                        if (account.ReportingCodeName) {
                            expect(account.ReportingCodeName).to.not.equal("");
                            expect(account.ReportingCodeName).to.be.a('string');
                        }

                        expect(account.HasAttachments).to.be.a('boolean');
                        expect(account.HasAttachments).to.not.be.undefined;

                        expect(account.UpdatedDateUTC).to.not.equal("");
                        expect(account.UpdatedDateUTC).to.be.a('string');
                    });
                    done();
                })
                .fail(function(err) {
                    done(wrapError(err));
                });
        });

        //Create a new account
        //Get it, Update it, then delete it

        var testAccountId = "";
        var testAccountData = {
            Code: 'TEST',
            Name: 'Test account from Node SDK',
            Type: 'EXPENSE'
        };

        it('CREATE ONE', function(done) {
            this.timeout(10000);
            var account = currentApp.core.accounts.newAccount(testAccountData);

            account.save()
                .then(function(ret) {
                    var thisAccount = ret.response.Accounts.Account;
                    expect(thisAccount.Code).to.equal(testAccountData.Code);
                    expect(thisAccount.Name).to.equal(testAccountData.Name);
                    expect(thisAccount.Type).to.equal(testAccountData.Type);
                    expect(thisAccount.BankAccountNumber).to.equal(testAccountData.BankAccountNumber);
                    //expect(thisAccount.Status).to.equal(testAccountData.Status);
                    //expect(thisAccount.Description).to.equal(testAccountData.Description);
                    expect(thisAccount.BankAccountType).to.equal(testAccountData.BankAccountType);
                    //expect(thisAccount.CurrencyCode).to.equal(testAccountData.CurrencyCode);
                    //expect(thisAccount.TaxType).to.equal(testAccountData.TaxType);
                    //expect(thisAccount.EnablePaymentsToAccount).to.equal(testAccountData.EnablePaymentsToAccount);
                    //expect(thisAccount.ShowInExpenseClaims).to.equal(testAccountData.ShowInExpenseClaims);

                    expect(thisAccount.AccountID).to.not.equal("");
                    testAccountId = thisAccount.AccountID;

                    console.log("Created Acct ID: " + testAccountId);
                    done();
                })
                .fail(function(err) {
                    console.log(util.inspect(err, null, null));
                    done(wrapError(err));
                });
        });

        it('GET ONE', function(done) {
            this.timeout(10000);
            currentApp.core.accounts.getAccount(testAccountId)
                .then(function(account) {
                    expect(account.Code).to.equal(testAccountData.Code);
                    expect(account.Name).to.equal(testAccountData.Name);
                    expect(account.Type).to.equal(testAccountData.Type);
                    expect(account.BankAccountNumber).to.equal(testAccountData.BankAccountNumber);
                    //expect(account.Status).to.equal(testAccountData.Status);
                    //expect(account.Description).to.equal(testAccountData.Description);
                    expect(account.BankAccountType).to.equal(testAccountData.BankAccountType);
                    //expect(account.CurrencyCode).to.equal(testAccountData.CurrencyCode);
                    //expect(account.TaxType).to.equal(testAccountData.TaxType);
                    //expect(account.EnablePaymentsToAccount).to.equal(testAccountData.EnablePaymentsToAccount);
                    //expect(account.ShowInExpenseClaims).to.equal(testAccountData.ShowInExpenseClaims);

                    expect(account.AccountID).to.not.equal("");
                    done();
                })
                .fail(function(err) {
                    console.log(util.inspect(err, null, null));
                    done(wrapError(err));
                });

        });

        it('UPDATE ONE', function(done) {
            this.timeout(10000);
            currentApp.core.accounts.getAccount(testAccountId)
                .then(function(account) {
                    testAccountData.Name = "Updated from the SDK";
                    account.Name = testAccountData.Name;

                    account.save()
                        .then(function(ret) {
                            var thisAccount = ret.response.Accounts.Account;
                            expect(thisAccount.Name).to.equal(testAccountData.Name);
                            done();
                        })
                        .fail(function(err) {
                            console.log(util.inspect(err, null, null));
                            done(wrapError(err));
                        });
                })
                .fail(function(err) {
                    console.log(util.inspect(err, null, null));
                    done(wrapError(err));
                });
        });

        it('DELETE ONE', function(done) {
            this.timeout(10000);
            currentApp.core.accounts.deleteAccount(testAccountId)
                .then(function(account) {
                    //console.log(account);
                    done();
                })
                .fail(function(err) {
                    console.log(util.inspect(err, null, null));
                    done(wrapError(err));
                });
        });

    });

    var InvoiceID = "";

    describe('invoices', function() {

        it('create invoice', function(done) {
            this.timeout(10000);
            var invoice = currentApp.core.invoices.newInvoice({
                Type: 'ACCREC',
                Contact: {
                    Name: 'Department of Testing'
                },
                DueDate: new Date().toISOString().split("T")[0],
                LineItems: [{
                    Description: 'Services',
                    Quantity: 4,
                    UnitAmount: 0.48593,
                    AccountCode: '400'
                }]
            });
            invoice.save({ unitdp: 4 })
                .then(function(ret) {
                    //(ret.entities[0].toObject().InvoiceID).should.not.be.empty();
                    var invoice = ret.entities[0].toObject();

                    InvoiceID = invoice.InvoiceID;

                    expect(InvoiceID).to.not.equal("");
                    invoice.LineItems.forEach(function(lineItem) {
                        expect(lineItem.UnitAmount).to.match(/\.[0-9]{4}/);
                    });


                    done();
                })
                .fail(function(err) {
                    console.log(util.inspect(err, null, null));
                    done(wrapError(err));
                })
        })

        it('get invoices', function(done) {
            this.timeout(10000);
            currentApp.core.invoices.getInvoices()
                .then(function(ret) {
                    done();
                })
                .fail(function(err) {
                    done(wrapError(err));
                })
        })
        it('get invoice', function(done) {
            this.timeout(10000);
            currentApp.core.invoices.getInvoice(InvoiceID)
                .then(function(invoice) {
                    done();
                })
                .fail(function(err) {
                    done(wrapError(err));
                })
        })
        it.skip('update invoice', function(done) {
            this.timeout(10000);
            currentApp.core.invoices.getInvoice(InvoiceID)
                .then(function(invoice) {
                    invoice.LineItems.push({
                        Description: 'Test',
                        Quantity: 1,
                        UnitAmount: 200,
                        AccountCode: '400'
                    })
                    invoice.Status = 'AUTHORISED'
                    invoice.save()
                        .then(function(ret) {
                            done();
                        })
                        .fail(function(err) {
                            done(wrapError(err));
                        })
                })
                .fail(function(err) {
                    done(wrapError(err));
                })
        })
    });

    /**
     * Payments Tests!
     * 
     */

    var PaymentID = "";

    describe.skip('payments', function() {
        this.timeout(10000);
        it('Create Payment', function(done) {

            var payment = currentApp.core.payments.createPayment({
                Invoice: {
                    InvoiceID: InvoiceID
                },
                Account: {
                    Code: '090'
                },
                Date: new Date().toISOString().split("T")[0],
                Amount: '660'
            });

            payment.save()
                .then(function(ret) {
                    PaymentID = ret.entities[0].toObject().PaymentID;
                    expect(PaymentID).to.not.equal("");
                    done();
                })
                .fail(function(err) {
                    console.log(util.inspect(err, null, null));
                    done(wrapError(err));
                });
        });

        it('Retrieve Payment', function(done) {

            currentApp.core.payments.getPayment(PaymentID)
                .then(function(payment) {
                    expect(payment.PaymentID).to.not.equal("");
                    done();
                })
                .fail(function(err) {
                    done(wrapError(err));
                })
        });

        it('Delete Payment', function(done) {
            //NOT CURRENTLY SUPPORTED.
            //Use update Payment with Payment.Status = DELETED.
            done();
        });

    });

    /**
     * Bank Transaction tests!
     * 
     */
    describe.skip('bank transactions', function() {

        var transactionId = "";

        it('get (no paging)', function(done) {
            this.timeout(10000);
            currentApp.core.bankTransactions.getBankTransactions()
                .then(function(ret) {
                    transactionId = ret[0].BankTransactionID;
                    done();
                })
                .fail(function(err) {
                    done(wrapError(err));
                })
        });

        it('get by id', function(done) {
            this.timeout(10000);
            currentApp.core.bankTransactions.getBankTransaction(transactionId)
                .then(function(ret) {
                    done();
                })
                .fail(function(err) {
                    done(wrapError(err));
                })
        })

    });

    describe.skip('tracking categories', function() {

    })

    describe.skip('payitems', function() {
        it('get payitems', function(done) {
            this.timeout(10000);
            currentApp.payroll.payitems.getPayItems()
                .then(function(payitems) {
                    console.log(payitems[0].EarningsTypes);
                    done();
                })
                .fail(function(err) {
                    done(wrapError(err));
                })
        })
    })
    describe.skip('timesheets', function() {
        it('create timesheet', function(done) {
            this.timeout(10000);
            var timesheet = currentApp.payroll.timesheets.newTimesheet({
                EmployeeID: '065a115c-ba9c-4c03-b8e3-44c551ed8f21',
                StartDate: new Date(2014, 8, 23),
                EndDate: new Date(2014, 8, 29),
                Status: 'Draft',
                TimesheetLines: [{
                    EarningsTypeID: 'a9ab82bf-c421-4840-b245-1df307c2127a',
                    NumberOfUnits: [5, 0, 0, 0, 0, 0, 0]
                }]
            });
            timesheet.save()
                .then(function() {
                    done();
                })
                .fail(function(err) {
                    done(wrapError(err));
                })

        })
        it.skip('get timesheets', function(done) {
            this.timeout(10000);
            currentApp.payroll.timesheets.getTimesheets()
                .then(function(timesheets) {
                    if (!_.isEmpty(timesheets))
                        console.log(util.inspect(timesheets[0].toObject(), null, null));
                    done();
                })
                .fail(function(err) {
                    done(wrapError(err));
                })
        })
    })

    describe.skip('employees', function() {
        var employee;
        it('get (no paging)', function(done) {
            this.timeout(10000);
            currentApp.payroll.employees.getEmployees()
                .then(function(ret) {
                    console.log(ret[0].toObject());
                    done();
                })
                .fail(function(err) {
                    done(wrapError(err));
                })
        })
        it.skip('get by id', function(done) {
            this.timeout(10000);
            currentApp.payroll.employees.getEmployee('065a115c-ba9c-4c03-b8e3-44c551ed8f21')
                .then(function(ret) {
                    employee = ret;
                    console.log(employee.toObject());
                    done();
                })
                .fail(function(err) {
                    done(wrapError(err));
                })
        })


    })
    describe.skip('contacts', function() {
        var contact;
        it('get by id', function(done) {
            this.timeout(10000);
            currentApp.core.contacts.getContact('891F1925-61E6-4955-ADF2-D87366D99DA4')
                .then(function(ret) {
                    contact = ret;
                    done();
                })
                .fail(function(err) {
                    done(wrapError(err));
                })
        })
        it('get (no paging)', function(done) {
            this.timeout(10000);
            currentApp.core.contacts.getContacts()
                .then(function(ret) {
                    done();
                })
                .fail(function(err) {
                    done(wrapError(err));
                })
        })
        it('get (paging)', function(done) {
            this.timeout(10000);
            currentApp.core.contacts.getContacts({ pager: { start: 1, callback: onContacts } })
                .fail(function(err) {
                    done(wrapError(err));
                })

            function onContacts(err, response, cb) {
                cb();
                try {
                    // response.data.length.should.equal(7,'Unexpected number of contacts returned');
                    if (response.finished)
                        done();
                } catch (ex) {

                    done(ex);
                    return;
                }

            }
        })
        it('get - modifiedAfter', function(done) {
            this.timeout(100000);
            var modifiedAfter = new Date();
            currentApp.core.contacts.getContacts({ modifiedAfter: modifiedAfter })
                .then(function(contacts) {
                    _.each(contacts, function(contact) {
                        contact.UpdatedDateUTC.should.be.above(modifiedAfter);
                    })
                    done();

                })
                .fail(function(err) {
                    done(wrapError(err));
                })

        })
        it('update contact', function(done) {
            this.timeout(10000);
            // Previously retrieved contact
            contact.FirstName = 'Jimbo';
            contact.save()
                .then(function() {
                    done();
                })
                .fail(function(err) {
                    done(wrapError(err));
                })
        })
        it('create single contact', function(done) {
            this.timeout(10000);
            var contact = currentApp.core.contacts.newContact({ Name: 'xemware' + Math.random(), FirstName: 'Tim', LastName: 'Shnaider' });
            contact.save()
                .then(function(ret) {
                    console.log(ret);
                    done();
                })
                .fail(function(err) {
                    console.log(err)
                    done(wrapError(err));
                })
        })
        it('create multiple contacts', function(done) {
            this.timeout(10000);
            var contacts = [];
            contacts.push(currentApp.core.contacts.newContact({ Name: 'xemware' + Math.random(), FirstName: 'Tim' + Math.random(), LastName: 'Shnaider' }));
            contacts.push(currentApp.core.contacts.newContact({ Name: 'xemware' + Math.random(), FirstName: 'Tim' + Math.random(), LastName: 'Shnaider' }));
            currentApp.core.contacts.saveContacts(contacts)
                .then(function(ret) {
                    done();
                })
                .fail(function(err) {
                    done(wrapError(err));
                })
        })
        it.skip('get attachments for contacts', function(done) {
            this.timeout(100000);
            contact.getAttachments()
                .then(function(attachments) {
                    console.log(attachments);
                    done();
                })
                .fail(function(err) {
                    console.log(err);
                    done(wrapError(err));
                })
        });
    })



    describe.skip('journals', function() {
        it.skip('get (paging)', function(done) {
            this.timeout(10000);
            currentApp.core.journals.getJournals({ pager: { start: 1, callback: onJournals } })
                .fail(function(err) {
                    done(wrapError(err));
                })

            var recordCount = 0;

            function onJournals(err, ret, cb) {
                cb();
                recordCount += ret.data.length;
                var firstRecord = _.first(ret.data);
                if (firstRecord)
                    console.log(util.inspect(firstRecord.toObject(), null, null))
                try {

                    if (ret.finished) {
                        console.log('Journals record count:' + recordCount)
                        done();
                    }
                } catch (ex) {
                    done(ex);
                    return;
                }

            }
        })

    });


});

function wrapError(err) {
    if (err instanceof Error)
        return err;
    else if (err.statusCode)
        return new Error(err.statusCode + ': ' + err.exception.Message);
}