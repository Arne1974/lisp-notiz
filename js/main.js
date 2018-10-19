$(document).ready(function () {
    var taxInterestCalculator = {
        list_container: $('.calc-list-container'),
        list_rows_selector: '.calc-list-row',
        amount: $('#dash-amount'),
        maturity: $('#dash-maturity'),
        dashboard_buttons: $('.calc-dashboard-item .btn'),
        dashboard_button_collection: {flex_btn: $('#flex-btn'), fixed_btn: $('#fixed-btn'), all_btn: $('#all-btn')},
        content_loading: $('.calc-list-loading'),
        onlinePreUrl: '/fileadmin/sys',
        importUrlProducts: '/json/products.json',
        importUrlSchema: '/json/anlageangebote_liste.json',
        products: [],
        schema: [],
        notToPromote: ['HSHNDEHH', 'CPLUDES1XXX'],
        filterList: [],
        settingsSearch: {searchTerm: '', startAmount: 1000},
        tracker: {trackingEnable: false, clientId: 0},
        init: function (searchTerm, startAmount) {
            var scope = this;

            this.checkEnviroment();
            this.createUniqueId();
            this.setSearchTerm(searchTerm, startAmount);
            
            $.when(
                    $.getJSON(this.importUrlSchema),
                    $.getJSON(this.importUrlProducts)
                    ).then(function (schemaData, productsData) {
                scope.schema = schemaData[0];
                scope.products = productsData[0];
                scope.main();
            });
        },
        main: function () {
            this.buildTemplate();
            this.initTooltip();
            this.setMaturityFilter();
            this.setListener();
            this.triggerSearchTerms();
            this.setStartFocus();
        },
        checkEnviroment: function () {
            if (document.URL.indexOf('zinspilot.de') !== -1) {
                this.importUrlProducts = this.onlinePreUrl + this.importUrlProducts;
                this.importUrlSchema = this.onlinePreUrl + this.importUrlSchema;
                
            }
        },
        createUniqueId: function () {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
            }
            this.tracker.clientId = s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
        },
        setSearchTerm: function (key, amount) {
            this.settingsSearch.searchTerm = key;
            this.settingsSearch.startAmount = amount;
        },
        buildTemplate: function () {
            var scope = this, children = [];

            this.products.forEach(function (el, i) {
                var e = $(el)[0],
                        pb = e.productBank,
                        p = e.product,
                        productBankBic = pb.bank.bic,
                        productBankName = pb.name,
                        maturityCode = p.maturityCode,
                        usp = e.upcomingStartDates;
                        
                if ((scope.notToPromote).indexOf(productBankBic) === -1) {
                    var pp = scope.buildProperties(productBankBic, productBankName, maturityCode),
                            maturityCodeTerm = ((maturityCode).toLowerCase().indexOf('fixed') >= 0) ? 'fixed' : 'flex',
                            rates = scope.buildRates(p.interestRateOverTime, usp, p.depositType),
                            showRatePreview = (rates.previewRate) ? 'Ab ' + rates.previewClear + ': ' + rates.previewRate + ' %' : '',
                            durationClear = (pp.duration === 12 && maturityCodeTerm === 'flex') ? 'Tagesgeld/<br>Flexgeld' : pp.duration + ' Monate',
                            showAmountNote = (maturityCodeTerm === 'fixed') ? '' : ' p.a.',
                            abstractSortNumber = ((pp.sortNumber) ? pp.sortNumber : i),
                            child = ['<ul class="calc-list-row" data-term="' + maturityCodeTerm + '">'
                                        , '<li class="calc-item-rate hidden-xs" data-rate="' + rates.rate + '">' + rates.ratesClear + '&nbsp;%'
                                        , '<div class="calc-sub-note"><span class="rate-explain-text">' + showRatePreview + '</span></div></li>'
                                        , '<li class="calc-item-maturitycode" data-duration="' + pp.duration + '">'
                                        , pp.announcement
                                        , '<span class="maturitycode-duration-wrapper">' + durationClear + '</span>'
                                        , '<div class="calc-sub-note hidden-xs"><span class="maturitycode-explain-text">Laufzeit</span></div>'
                                        , '</li>'
                                        , '<li class="calc-item-productbankname"><span class="productbankname-logo-wrapper">' + pp.productBankLogo + '</span>'
                                        , '<div class="calc-sub-note hidden-xs"><span class="logo-country-text" data-toggle="tooltip" data-placement="bottom" title="' + pp.showTooltip + '">' + pp.productBankCountry + '</span></div>'
                                        , '</li>'
                                        , '<li class="calc-item-rate visible-xs-block" data-rate="' + rates.rate + '"><span class="rate-text-wrapper">' + rates.ratesClear + '&nbsp;%</span>'
                                        , '<div class="calc-sub-note"><span class="rate-explain-text">' + showRatePreview + '</span></div>'
                                        , '</li>'
                                        , '<li class="calc-item-amount hidden-xs">'
                                        , '<span class="calc-amount-price">0,00</span>'
                                        , '<span class="calc-amount-currency">&euro;</span>'
                                        , '<div class="calc-sub-note"><span class="amount-note-text">Zinsertrag' + showAmountNote + '<sup>*</sup></span></div>'
                                        , '</li>'
                                        , '<li class="calc-item-description hidden-sm hidden-xs">'
                                        , '<div class="item-description-text">'
                                        , pp.descriptionHtml
                                        , '<div class="calc-sub-note">'
                                        , '&nbsp;&nbsp;&nbsp;<a href="' + pp.urlAnlageangebot + '" target="_blank" class="item-description-anchor">Angebotsdetails</a>'
                                        , '</div>'
                                        , '</div>'
                                        , '</li>'
                                        , '<li class="calc-item-cta">'
                                        , '<span class="cta-button-wrapper"><a href="https://www.example.org?params=/flows/register" target="_blank" class="btn btn-primary">Jetzt anlegen</a></span>'
                                        , '<div class="calc-sub-note hidden-lg hidden-md"><a href="' + pp.urlAnlageangebot + '" target="_blank" class="cta-more-text">Weitere Informationen</a></div>'
                                        , '</li>'
                                        , '</ul>'].join('\n');

                    children[abstractSortNumber] = child;

                    //Add up fixed-items to Maturity-Filter Array, if not allready in
                    if ((scope.filterList).indexOf(pp.duration) === -1) {
                        scope.filterList.push(pp.duration);
                    }
                }
            });

            scope.list_container.append(children);
            this.content_loading.remove();
        },
        buildRates: function (r, usp, depositType) {
            var rate = {}, d = new Date(),
                    beforeTrancheEnd = (d.setDate(d.getDate() + 3));

            if (depositType === 'DIRECT_ACCESS') {
                r.forEach(function (e) {
                    var realRate = e.rate,
                            validFrom = new Date(e.validFrom);

                    if (Date.parse(validFrom) < beforeTrancheEnd) {
                        rate.rate = realRate;
                        rate.ratesClear = (realRate * 100).toFixed(2).replace('.', ',');
                    } else {
                        if (rate.previewRate === undefined) {
                            rate.previewRate = (realRate * 100).toFixed(2).replace('.', ',');
                            rate.previewClear = validFrom.getDate() + '.' + (validFrom.getMonth() + 1) + '.';
                        }
                    }
                });
            } else {
                r.map(function (e) {
                    var realRate = e.rate,
                            validFrom = new Date(e.validFrom);

                    if (Date.parse(validFrom) < beforeTrancheEnd) {
                        rate.rate = realRate;
                        rate.ratesClear = (realRate * 100).toFixed(2).replace('.', ',');
                    }
                });

                usp.forEach(function (e) {
                    var realRate = e.rate,
                            startDate = new Date(e.startDate);

                    if (rate.rate !== realRate) {
                        if (rate.previewRate === undefined) {
                            rate.previewRate = (realRate * 100).toFixed(2).replace('.', ',');
                            rate.previewClear = startDate.getDate() + '.' + (startDate.getMonth() + 1) + '.';
                        }
                    }
                });
            }
            return rate;
        },
        buildProperties: function (productBankBic, productBankName, maturityCode) {
            var scope = this,
                    settings = {
                        'duration': 12,
                        'productBankCountry': 'tbd',
                        'showTooltip': 'tbd',
                        'urlAnlageangebot': 'https://www.example.org?params=/product/details/' + productBankBic + '/' + maturityCode,
                        'productBankLogo': 'tbd',
                        'sortNumber': 0,
                        'descriptionHtml': '',
                        'special': ''
                    };

            //Duration
            if (maturityCode.toLowerCase().indexOf('fixed') >= 0) {
                var term = maturityCode.split('_').pop(),
                        patt = /[0-9]*/g,
                        result = patt.exec(term);
                settings.duration = (term.toLowerCase().indexOf('m') >= 0) ? result[0] : result[0] * 12;
            }

            //Other
            var link = '', imageSrc = '';
            settings.showTooltip = 'Einlagen sind pro Kunde bis 100.000 EUR zu 100 % abgesichert.';

            if (productBankBic === 'HAABAT2K') {
                imageSrc = 'https://via.placeholder.com/120x53?logo=csm_Anadi_Logo_192d674e89.png';
                link = '/#anadi';
                settings.productBankCountry = '&Ouml;sterreich';
            } else if (productBankBic === 'BUCUROBU') {
                imageSrc = 'https://via.placeholder.com/120x53?logo=logo_alpha_bank_160x34.png';
                link = '/#alpha';
                settings.productBankCountry = 'Rum&auml;nien';
            } else if (productBankBic === 'ATMBGB22') {
                imageSrc = 'https://via.placeholder.com/120x53?logo=banklogo/atombank_logo.png';
                link = '/#atom';
                settings.productBankCountry = 'Gro&szlig;britannien';
                settings.showTooltip = 'Einlagen sind pro Kunde bis 85.000 GBP zu 100 % abgesichert.';
            } else if (productBankBic === 'CBRLGB2L') {
                imageSrc = 'https://via.placeholder.com/120x53?logo=Close_Brothers_Savings_Logo.png';
                link = '/#closebrothers';
                settings.productBankCountry = 'Gro&szlig;britannien';
                settings.showTooltip = 'Einlagen sind pro Kunde bis 85.000 GBP zu 100 % abgesichert.';
            } else if (productBankBic === 'PARXLV22') {
                imageSrc = 'https://via.placeholder.com/120x53?logo=Citadele_Logo_klein.jpg';
                link = '/#cbl';
                settings.productBankCountry = 'Lettland';
            } else if (productBankBic === 'CPLUDES1XXX') {
                imageSrc = 'https://via.placeholder.com/120x53?logo=CP_Logo_transp_v2.png';
                link = '/#creditplus';
                settings.productBankCountry = 'Deutschland';
            } else if (productBankBic === 'FIMBMTM3XXX') {
                imageSrc = 'https://via.placeholder.com/120x53?logo=csm_fimbank_730c9feb99.png';
                link = '/#fim';
                settings.productBankCountry = 'Malta';
            } else if (productBankBic === 'BACCFR22') {
                imageSrc = 'https://via.placeholder.com/120x53?logo=oney_logo_klein.jpg';
                link = '/#oney';
                settings.productBankCountry = 'Frankreich';
            } else if (productBankBic === 'RTMBLV2X') {
                imageSrc = 'https://via.placeholder.com/120x53?logo=RietumuLogo.gif';
                link = '/#rietumu';
                settings.productBankCountry = 'Lettland';
            } else if (productBankBic === 'BDIGPTPL') {
                imageSrc = 'https://via.placeholder.com/120x53?logo=big_logo.png';
                link = '/#bigbank';
                settings.productBankCountry = 'Portugal';
            } else {
                imageSrc = 'https://via.placeholder.com/120x53';
                link = 'https://www.example.org/';
                settings.productBankCountry = 'Utopia';
            }
            settings.productBankLogo = '<a href="' + link + '" target="_blank" title="' + productBankName + '"><img src="' + imageSrc + '" alt="' + productBankName + '" /></a>';

            //SortNumber
            this.schema.forEach(function (e) {
                if (maturityCode === e.maturity && productBankBic === e.bic) {
                    settings.sortNumber = e.sort_no;
                    settings.descriptionHtml = scope.renderDescription(e.desc1, e.desc2, e.desc3, e.bonusurl);

                    if (e.special !== undefined && e.special !== '') {
                        settings.announcement = '<div class="item-maturitycode-anouncement">' + e.special + '</div>';
                    }
                }
            });

            return settings;
        },
        renderDescription: function (desc1, desc2, desc3, bonusurl) {
            var desc = '';
            if (desc1 !== '') {
                desc += '<ul class="description-text-list">';
                desc += '<li>' + desc1 + '</li>';
                if (bonusurl !== undefined && bonusurl !== '') {
                    desc2 = '<a href="' + bonusurl + '" target="_blank">' + desc2 + '</a>';
                }
                desc += '<li>' + desc2 + '</li>';
                desc += '<li>' + desc3 + '</li>';
                desc += '</ul>';
            }
            return desc;
        },
        trackAction: function (trackingData) {
            if (this.tracker.trackingEnable && trackingData !== {}) {
                var gtmData = {'taxInterestCalculator': $.extend(trackingData, this.fillTrackState()), 'event': 'zinsrechner'};
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push(gtmData);
            }
        },
        fillTrackState: function () {
            return {
                'event': 'zinsrechner',
                'clientId': this.tracker.clientId,
                'amount': this.amount.val(),
                'button': this.dashboard_buttons.end().find('.active').text(),
                'duration': this.maturity.val()
            };
        },
        calculate: function (amount) {
            var scope = this;

            if (!isNaN(amount) && amount >= 0) {
                //Run all DOM-elements in list
                scope.list_container.children(scope.list_rows_selector).each(function (i, e) {
                    var rate = $(e).find('.calc-item-rate').data('rate'),
                            duration = $(e).find('.calc-item-maturitycode').data('duration'),
                            term = $(e).data('term'),
                            result = (term === 'fixed') ? scope.calcAmountFixed(amount, rate, duration) : scope.calcAmountFlex(amount, rate);
                    $(e).find('.calc-amount-price').html(result);
                });
            }
        },
        calcAmountFixed: function (amount, rate, duration) {
            return ((amount * rate) / 12 * duration).toFixed(2).replace('.', ',');
        },
        calcAmountFlex: function (amount, rate) {
            return ((amount * rate)).toFixed(2).replace('.', ',');
        },
        applyFilter: function (selected) {
            this.clearListFilter();

            if (selected === 'all') {
                this.clearDashboardButton();
                this.setActiveButton('all_btn', 'all');
                this.maturity.blur();
            } else if (selected === 'p.a.') {
                this.clearDashboardButton();
                this.setActiveButton('flex_btn', 'flex');
            } else if (selected > 0) {
                this.clearDashboardButton();
                this.setActiveButton('fixed_btn', 'fixed');
                this.list_container.children(this.list_rows_selector).find('.calc-item-maturitycode:NOT([data-duration=' + selected + '])').parent().addClass('hidden');
                this.maturity.blur();
            }
        },
        clearListFilter: function () {
            this.list_container.children(this.list_rows_selector).removeClass('hidden');
        },
        resetFilterTo: function (searchDuration) {
            this.maturity.find('option').removeAttr('selected');
            this.maturity.val(searchDuration);
            this.maturity.blur();
        },
        setMaturityFilter: function () {
            var filter = '';
            this.filterList.sort(function (a, b) {
                return a - b
            }).forEach(function (e) {
                filter += '<option value="' + e + '" data-duration="' + e + '">' + e + ' Monate</option>';
            });
            this.maturity.append(filter);
        },
        setListener: function () {
            var scope = this;

            //Betrag
            this.amount.on('keyup triggerAmountCalculation', scope, function () {
                var amount = scope.amount.val().replace('.', '').replace(',', '.'),
                        decimal = amount.split('.');
                if (decimal.length > 1 && decimal[decimal.length - 1] !== '' && decimal[decimal.length - 1].length > 2) {
                    amount = decimal[0] + '.' + (decimal[decimal.length - 1]).slice(0, 2);
                    $(this).val(amount.replace('.', ','));
                }
                scope.calculate(amount);
            });

            //Dashboard-Buttons
            this.dashboard_buttons.on('click', scope, function (e) {
                e.preventDefault();
                scope.clearListFilter();
                var terms = $(this).attr('id'),
                        term_btn = terms.replace('-', '_'),
                        term = terms.replace('-btn', '');

                scope.clearDashboardButton();
                scope.setActiveButton(term_btn, term);
            });

            //Laufzeit
            this.maturity.on('change', scope, function () {
                var selected = $(this).find('option:selected').data('duration');
                scope.applyFilter(selected);
            });

            //Link
            this.list_container.on('click', 'a', scope, function () {
                var type = ($(this).hasClass('item-description-anchor')) ? 'Link' : 'Button';
                scope.trackAction({'trigger': type, 'url': $(this).attr('href')});
            });
        },
        setActiveButton: function (term_btn, term) {
            this.dashboard_button_collection[term_btn].addClass('active');

            if (term !== 'all') {
                this.list_container.find('.calc-list-row:NOT([data-term=' + term + '])').addClass('hidden');
            }

            if (term === 'flex') {
                this.resetFilterTo('p.a.');
            } else if (term === 'all' || (term === 'fixed' && this.maturity.val() === 'p.a.')) {
                this.resetFilterTo('all');
            }
        },
        clearDashboardButton: function () {
            this.dashboard_buttons.removeClass('active');
        },
        setStartFocus: function () {
            this.amount.select();
        },
        initTooltip: function () {
            this.list_container.find('[data-toggle="tooltip"]').tooltip();
        },
        triggerSearchTerms: function () {
            var searchTerm = this.settingsSearch.searchTerm,
                    startAmount = this.settingsSearch.startAmount;

            if (searchTerm !== undefined) {
                if (searchTerm.toLowerCase() === 'festgeld') {
                    $(this.dashboard_button_collection.fixed_btn).trigger('click');
                } else if (searchTerm.toLowerCase() === 'tagesgeld' || searchTerm.toLowerCase() === 'flexgeld' || searchTerm.toLowerCase() === 'flexgeld24') {
                    $(this.dashboard_button_collection.flex_btn).trigger('click');
                }
            }

            if (startAmount !== undefined) {
                this.amount.val(startAmount).trigger('triggerAmountCalculation');
            }
        }
    };

    (function () {
        var searchTerm = document.URL.split('#').pop(),
                amount = $('#dash-amount').val();
        taxInterestCalculator.init(searchTerm, amount);
    })();
});