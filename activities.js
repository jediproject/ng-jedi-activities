/*
 ng-jedi-activities v0.0.9
 Background tasks component written in angularjs
 https://github.com/jediproject/ng-jedi-activities
*/
(function (factory) {
    if (typeof define === 'function') {
        define(['angular', 'moment', 'file-saver-saveas-js', 'angular-indexed-db'], factory);
    } else {
        if (typeof module !== "undefined" && typeof exports !== "undefined" && module.exports === exports) {
            module.exports = 'jedi.activities';
        }
        return factory();
    }
}(function () {
    'use strict';

    var activityItems = [];
    var activitiesRefreshUrl = [];
    var hideClass = 'hideMe';
    var minimizeClass = 'minimizeMe';
    var storeName = 'activities';

    function guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }

    angular.module('jedi.activities', ['indexedDB']).config(['$indexedDBProvider', function ($indexedDBProvider) {
        $indexedDBProvider
            .connection('activities')
            .upgradeDatabase(1, function (event, db, tx) {
                var objStore = db.createObjectStore(storeName, { keyPath: 'id' });
            });
    }]);

    angular.module('jedi.activities').constant('jedi.activities.ActivitiesConfig', {
        inProgressWarning: 'You will lost {{count}} activities. Would you like to continue?',
        i18nDirective: '',
        title: 'Activities',
        minimizeLabel: 'Minimize',
        closeLabel: 'Close',
        successLabel: 'Success',
        doneLabel: 'Done',
        errorLabel: 'Error',
        saveLabel: 'Save',
        removeLabel: 'Remove',
        clearAllLabel: 'Clear All'
    });

    angular.module('jedi.activities').service('jedi.activities.ActivitiesService', ['$q', '$http', '$rootScope', '$timeout', '$indexedDB', '$log', function ($q, $http, $rootScope, $timeout, $indexedDB, $log) {

        this.initActivity = function (baseUrl, apiUrl, method, params, activityName, userLogin, respType) {

            var timeout;
            var duration = moment.duration();

            var onTimeout = function () {
                duration.add(1, 's');
                activityItem.duration = "(" + (duration.hours() ? duration.hours() + ':' : '') + ('0' + duration.minutes()).slice(-2) + ':' + ('0' + duration.seconds()).slice(-2) + ")";
                if (activityItem.status === 'progress') {
                    timeout = $timeout(onTimeout, 1000);
                }
            };

            var activityItem = {
                id: guid(),
                name: activityName,
                status: 'progress',
                duration: '(00:00)',
                userLoginHash: CryptoJS.MD5(userLogin).toString(),
                async: false
            };

            activityItems.push(activityItem);

            var request = {
                method: method.toUpperCase(),
                url: baseUrl + '/' + apiUrl,
                data: params,
                responseType: respType ? respType : 'arraybuffer',
                ignoreLoadingBar: true,
                showLoadingModal: false
            };

            $timeout(onTimeout);

            var httpPromise = $http(request).success(function (data, status, headers, config) {

                if (request.responseType.toLowerCase() === 'arraybuffer' || request.responseType.toLowerCase() === 'blob') {
                    var contentDisposition = headers("content-disposition");
                    var filename = contentDisposition ? contentDisposition.substring((contentDisposition.indexOf('filename=') + 9)) : '';

                    if (filename) {
                        activityItem.name = filename;
                    }

                    activityItem.status = 'success';
                    activityItem.data = new Blob([data], { type: headers("content-type") });

                    insertToIndexedDb(activityItem);
                } else {
                    activityItem.status = 'done';
                    activityItem.data = data;

                    insertToIndexedDb(activityItem);
                }
            }).error(function (data, status) {
                activityItem.status = 'error';
                activityItem.data = null;

                insertToIndexedDb(activityItem);
            });

            return $q.when(
                httpPromise.then(function (response) {
                    return {
                        duration: duration.asMilliseconds(),
                        name: activityItem.name,
                        data: activityItem.data,
                        status: activityItem.status
                    }
                })
            );
        };

        this.initAsyncActivity = function (baseUrl, apiUrl, method, params, activityName, userLogin) {

            // Check if exists baseUrl in refresh APIs, Asynchronous activities must have a refresh url.
            if (_.some(activitiesRefreshUrl, function (s) { return s.indexOf(baseUrl) !== -1; })) {
                throw "Asynchronous activities must have a refresh url with the same baseUrl of activity. This must be set on loadAsyncActivities";
            }

            var timeout;
            var duration = moment.duration();

            var onTimeout = function () {
                duration.add(1, 's');
                activityItem.duration = "(" + (duration.hours() ? duration.hours() + ':' : '') + ('0' + duration.minutes()).slice(-2) + ':' + ('0' + duration.seconds()).slice(-2) + ")";
                if (activityItem.status === 'progress') {
                    timeout = $timeout(onTimeout, 1000);
                }
            };

            var activityItem = {
                id: guid(),
                name: activityName,
                status: 'progress',
                duration: '(00:00)',
                userLoginHash: CryptoJS.MD5(userLogin).toString(),
                async: true,
                baseUrl: baseUrl
            };

            activityItems.push(activityItem);

            var request = {
                method: method.toUpperCase(),
                url: baseUrl + '/' + apiUrl,
                data: params,
                ignoreLoadingBar: true,
                showLoadingModal: false
            };

            $timeout(onTimeout);

            // Asynchronous activities just return on init when error. 
            var httpPromise = $http(request).error(function (data, status) {
                activityItem.status = 'error';
                activityItem.data = null;

                insertToIndexedDb(activityItem);
            });

            return $q.when(
                httpPromise.then(function (response) {
                    return {
                        duration: duration.asMilliseconds(),
                        name: activityItem.name,
                        data: activityItem.data,
                        status: activityItem.status
                    }
                })
            );
        };

        this.clearAll = function clearAll() {
            $rootScope.$broadcast('jedi.activities.clearAll');
        };

        this.toggle = function toggleMonitor() {
            $rootScope.$broadcast('jedi.activities.toggleMonitor');
        };

        this.validateActivities = function validateActivities(userIdentity) {
            $rootScope.$broadcast('jedi.activities.validateActivities', userIdentity);
        };

        this.hasInProgressActivities = function hasInProgressActivities() {
            var count = 0;
            angular.forEach(activityItems, function (item, index) {
                if (item.status === "progress") {
                    count++;
                }
            });
            return count > 0;
        };

        this.hasActivities = function hasActivities() {
            return activityItems.length > 0;
        }

        function insertToIndexedDb(item) {
            $indexedDB.openStore(storeName, function (store) {
                store.insert({ "id": item.id, "activityItem": item }).then(function (e) {
                    $log.info('Inserindo atividade id: ' + e);
                });
            });
        };

    }]).directive('jdActivity', ['$log', '$interpolate', 'jedi.activities.ActivitiesConfig', function ($log, $interpolate, ActivitiesConfig) {
        return {
            restrict: 'E',
            replace: true,
            link: function (scope, element, attrs, activitiesCtrl) {
                scope.$watch(function () {
                    return activityItems.length;
                },
                    function (value) {
                        if (value && value > 0) {
                            element.removeClass(hideClass);

                            var inProgressCount = activitiesCtrl.getInProgressItemsCount();
                            if (inProgressCount > 0) {
                                element.removeClass(minimizeClass);
                                activitiesCtrl.activitiesModel.minimize = false;
                            }
                        } else {
                            element.addClass(hideClass);
                        }
                    });

                window.onbeforeunload = function (evt) {
                    var obj = { count: activitiesCtrl.getInProgressItemsCount() };

                    if (obj.count > 0) {
                        return $interpolate(ActivitiesConfig.inProgressWarning)(obj);
                    }
                }

                scope.$on('jedi.activities.clearAll', activitiesCtrl.clearAll);

                scope.$on('jedi.activities.toggleMonitor', activitiesCtrl.toggle);

                scope.$on('jedi.activities.validateActivities', activitiesCtrl.validateActivities);
            },
            controller: ['$scope', '$attrs', '$element', '$timeout', '$log', '$indexedDB', '$rootScope', '$http', function Controller(scope, attrs, element, $timeout, $log, $indexedDB, $rootScope, $http) {

                $log.info(activityItems.length);

                var vm = this;
                vm.activitiesModel = {
                    minimize: false
                };

                vm.remove = remove;
                vm.saveIconClick = saveIconClick;
                vm.refresh = refresh;
                vm.close = close;
                vm.hasItemsToShow = hasItemsToShow;
                vm.clearAll = clearAll;
                vm.show = show;
                vm.toggle = toggle;
                vm.validateActivities = validateActivities;
                vm.getInProgressItemsCount = getInProgressItemsCount;

                initCtrl();

                function initCtrl() {
                    scope.activityItems = activityItems;
                }

                function remove(item) {
                    if (item.status == 'progress' || item.isRemoving) {
                        return;
                    }

                    item.isRemoving = true;

                    $log.info("Removendo item " + item.name);

                    if (item.isAsync) {
                        //Hiding Async item
                        var request = {
                            method: 'POST',
                            url: item.baseUrl + '/' + item.hideApiUrl,
                            ignoreLoadingBar: true,
                            showLoadingModal: false
                        }

                        $http.post(request).then(function (result) {
                            var index = activityItems.indexOf(item);
                            activityItems.splice(index, 1);
                        }, function (error) {

                        });
                    } else {
                        //Removing item from localStorage
                        var index = activityItems.indexOf(item);
                        activityItems.splice(index, 1);
                        $indexedDB.openStore(storeName, function (store) {
                            store.delete(item.id);
                        });
                    }
                }

                function getInProgressItemsCount() {
                    var count = 0;
                    angular.forEach(activityItems, function (item, index) {
                        if (item.status === "progress") {
                            count++;
                        }
                    });
                    return count;
                }

                function saveIconClick(item) {
                    if (item.status != 'success' || item.isRemoving) {
                        return;
                    }

                    $log.info("Salvando item " + item.name);
                    saveAs(item.data, item.name);
                }

                function refresh() {
                    //ToDo ?
                    $log.info("Atualizando lista de itens");
                }

                function close() {
                    element.addClass(hideClass);
                }

                function hasItemsToShow() {
                    return activityItems && activityItems.length > 0;
                }

                function clearAll() {
                    $log.info('Removendo lista de atividades');

                    for (var i = activityItems.length - 1; i >= 0; i--) {
                        remove(activityItems[i]);
                    }
                }

                function show() {
                    element.removeClass(hideClass);
                    element.removeClass(minimizeClass);
                }

                function toggle() {
                    if (element.hasClass(hideClass)) {
                        show();
                    } else {
                        close();
                    }
                }

                function validateActivities(evt, userIdentity) {
                    $indexedDB.openStore(storeName, function (store) {
                        store.getAll().then(function (objects) {
                            angular.forEach(objects, function (item) {
                                if (userIdentity) {
                                    var currentUserLoginHash = CryptoJS.MD5(userIdentity.login).toString();
                                    if (item.activityItem.userLoginHash === currentUserLoginHash) {
                                        activityItems.push(item.activityItem);
                                        return;
                                    }
                                }

                                store.delete(item.id);
                                for (var i = 0; i < activityItems.length; i++) {
                                    if (activityItems[i].id === item.id) {
                                        activityItems.splice(i, 1);
                                    }
                                }
                            });
                        });
                    });
                }
            }],
            controllerAs: 'activitiesCtrl',
            bindToController: true,
            templateUrl: function (elem, attrs) {
                if (attrs.templateUrl) {
                    return attrs.templateUrl;
                } else {
                    return "assets/libs/ng-jedi-activities/activities.html";
                }
            },
        };
    }]).run(['$templateCache', 'jedi.activities.ActivitiesConfig', function ($templateCache, ActivitiesConfig) {
        var tmpl = '<div ng-class="{ minimizeMe: activitiesCtrl.activitiesModel.minimize }" class="animate-slide panel-default collapsable hideMe">' +
            '    <div class="panel-heading activities-header">' +
            '        <div class="row">' +
            '            <div class="col-md-7 col-xs-7 col-sm-7 col-lg-7 pull-left activities-active" ng-click="activitiesCtrl.activitiesModel.minimize = !activitiesCtrl.activitiesModel.minimize">' +
            '                <strong id="activitiesHeaderContent" class="activities-header-content">' +
            '                    <i class="fa" ng-class="{ \'fa-spin\' : activitiesCtrl.activitiesModel.minimize && activitiesCtrl.getInProgressItemsCount() > 0, \'fa-cog\':  activitiesCtrl.activitiesModel.minimize && activitiesCtrl.getInProgressItemsCount() > 0, \'fa-tasks\': !activitiesCtrl.activitiesModel.minimize || (activitiesCtrl.activitiesModel.minimize && !activitiesCtrl.getInProgressItemsCount()) }"></i>' +
            '                    <jd-i18n>' +
            '                        ' + ActivitiesConfig.title +
            '                    </jd-i18n>' +
            '                </strong>' +
            '            </div>' +
            '            <div class="col-md-5 col-xs-5 col-sm-5 col-lg-5 text-right">' +
            '                <span class="activities-active clear-all" jd-i18n title="Clear All" ng-click="activitiesCtrl.clearAll()">' + ActivitiesConfig.clearAllLabel + '</span>&nbsp;' +
            '                <span class="glyphicon activities-active glyphicon-minus" jd-i18n title="' + ActivitiesConfig.minimizeLabel + '" ng-click="activitiesCtrl.activitiesModel.minimize = !activitiesCtrl.activitiesModel.minimize"></span>&nbsp;' +
            '                <span class="glyphicon activities-active glyphicon-remove" jd-i18n title="' + ActivitiesConfig.closeLabel + '" ng-click="activitiesCtrl.close()"></span>' +
            '            </div>' +
            '        </div>' +
            '    </div>' +
            '    <div class="panel-body activities-scroll">' +
            '        <div ng-repeat="item in activityItems track by item.id">' +
            '            <div class="row" ng-class="{\'is-removing\' : item.isRemoving}">' +
            '                <div class="col-md-9 col-xs-9 col-sm-9 col-lg-9 activities-content">' +
            '                    <span>{{item.name}} - {{item.duration}}</span>' +
            '                </div>' +
            '                <div class="col-md-3 col-xs-3 col-sm-3 col-lg-3 text-right">' +
            '                    <span class="activities-progress" ng-if="item.status == \'progress\'"><i class="fa fa-cog fa-spin"></i></span>' +
            '                    <span class="activities-done glyphicon glyphicon-ok" ng-if="item.status == \'success\'" jd-i18n title="' + ActivitiesConfig.successLabel + '"></span>' +
            '                    <span class="activities-done glyphicon glyphicon-ok" ng-if="item.status == \'done\'" jd-i18n title="' + ActivitiesConfig.doneLabel + '"></span>' +
            '                    <span class="activities-error glyphicon glyphicon-exclamation-sign" ng-if="item.status == \'error\'" jd-i18n title="' + ActivitiesConfig.errorLabel + '"></span>' +
            '                    <span class="activities-inactive glyphicon glyphicon-save" ng-class="{\'activities-active\' : item.status == \'success\' }" jd-i18n title="' + ActivitiesConfig.saveLabel + '" ng-click="activitiesCtrl.saveIconClick(item)"></span>' +
            '                    <span class="activities-inactive glyphicon glyphicon-remove" ng-class="{\'activities-active\' : item.status != \'progress\' }" jd-i18n title="' + ActivitiesConfig.removeLabel + '" ng-click="activitiesCtrl.remove(item)"></span>' +
            '                </div>' +
            '                <div class="col-md-1 col-xs-1 col-sm-1 col-lg-1">' +
            '                </div>' +
            '                <div class="col-md-1 col-xs-1 col-sm-1 col-lg-1">' +
            '                </div>' +
            '            </div>' +
            '            <hr class="row activities-divider" />' +
            '        </div>' +
            '    </div>' +
            '</div>';

        if (ActivitiesConfig.i18nDirective) {
            tmpl = tmpl.replace('jd-i18n', ActivitiesConfig.i18nDirective);
        }

        $templateCache.put('assets/libs/ng-jedi-activities/activities.html', tmpl);
    }]);
}));