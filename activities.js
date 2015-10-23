'use strict';

define(['angular', 'moment', 'file-saver-saveas-js', 'angular-indexed-db', 'cryptojslib'], function () {

    var activityItems = [];
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

    angular.module('jedi.activities', []).config(['$indexedDBProvider', function ($indexedDBProvider) {
        $indexedDBProvider
            .connection('activities')
            .upgradeDatabase(1, function (event, db, tx) {
                var objStore = db.createObjectStore(storeName, { keyPath: 'id' });
            });
    }]);

    angular.module('jedi.activities').constant('jedi.activities.ActivitiesConfig', {
        inProgressWarning: 'Ao realizar esta ação você perderá {{count}} atividade(s) pendentes.',
        i18nDirective: ''
    });

    angular.module('jedi.activities').service('jedi.activities.ActivitiesService', ['$q', '$http', '$rootScope', '$timeout', '$indexedDB', '$log', function ($q, $http, $rootScope, $timeout, $indexedDB, $log) {

        this.initActivity = function (baseUrl, apiUrl, method, params, activityName, userLogin) {

            var timeout = $timeout(onTimeout, 1000);
            var duration = moment.duration();

            var onTimeout = function () {
                duration.add(1, 's');
                activityItem.duration = "(" + (duration.hours() ? duration.hours() + ':' : '') + ('0' + duration.minutes()).slice(-2) + ':' + ('0' + duration.seconds()).slice(-2) + ")";
                timeout = $timeout(onTimeout, 1000);

                if (activityItem.status != 'progress') {
                    $timeout.cancel(timeout);
                }
            };

            var activityItem = {
                id: guid(),
                fileName: activityName,
                status: 'progress',
                duration: '(00:00)',
                userLoginHash: CryptoJS.MD5(userLogin).toString()
            };

            activityItems.push(activityItem);

            var request = {
                method: method.toUpperCase(),
                url: baseUrl + '/' + apiUrl,
                data: params,
                responseType: 'arraybuffer',
                ignoreLoadingBar: true,
                showLoadingModal: false
            };

            $timeout(onTimeout);

            var httpPromise = $http(request).success(function (data, status, headers, config) {

                var contentDisposition = headers("content-disposition");
                var filename = contentDisposition.substring((contentDisposition.indexOf('filename=') + 9));

                activityItem.status = 'success';
                activityItem.fileName = filename;
                activityItem.data = new Blob([data], { type: headers("content-type") });

                insertToIndexedDb(activityItem);
            }).error(function (data, status) {
                activityItem.status = 'error';
                activityItem.data = null;

                insertToIndexedDb(activityItem);
            });

            return $q.when(
                httpPromise.then(function (response) {
                    return duration.asMilliseconds();
                })
            );
        };

        this.clearActivities = function clearActivities() {
            $rootScope.$broadcast('jedi.activities.clearActivities');
        };

        this.toggle = function toggleMonitor() {
            $rootScope.$broadcast('jedi.activities.toggleMonitor');
        };

        this.validateActivities = function validateActivities() {
            $rootScope.$broadcast('jedi.activities.validateActivities');
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
            compile: function (element, attrs) {
                if (ActivitiesConfig.i18nDirective) {
                    var newi18n = document.createElement(ActivitiesConfig.i18nDirective);
                    var text = document.createTextNode("Atividades");
                    newi18n.appendChild(text);
                    var oldi18n = document.querySelector("i18n");
                    document.querySelector("#activitiesHeaderContent").replaceChild(newi18n, oldi18n);
                }

                return function postLink(scope, element, attrs, activitiesCtrl) {
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

                    scope.$on('jedi.activities.clearActivities', activitiesCtrl.clear);

                    scope.$on('jedi.activities.toggleMonitor', activitiesCtrl.toggle);

                    scope.$on('jedi.activities.validateActivities', activitiesCtrl.validateActivities);
                }

            },
            controller: ['$scope', '$attrs', '$element', '$timeout', '$log', '$indexedDB', '$rootScope', function Controller(scope, attrs, element, $timeout, $log, $indexedDB, $rootScope) {

                $log.info(activityItems.length);

                var vm = this;
                vm.activitiesModel = {
                    minimize: false
                };

                vm.removeIconClick = removeIconClick;
                vm.saveIconClick = saveIconClick;
                vm.refresh = refresh;
                vm.close = close;
                vm.hasItemsToShow = hasItemsToShow;
                vm.clear = clear;
                vm.show = show;
                vm.toggle = toggle;
                vm.validateActivities = validateActivities;
                vm.getInProgressItemsCount = getInProgressItemsCount;

                initCtrl();

                function initCtrl() {
                    scope.activityItems = activityItems;
                }

                function removeIconClick(item) {
                    if (item.status == 'progress') {
                        return false;
                    }
                    $log.info("Removendo item " + item.fileName);
                    var index = activityItems.indexOf(item);
                    activityItems.splice(index, 1);
                    $indexedDB.openStore(storeName, function (store) {
                        store.delete(item.id);
                    });
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
                    if (item.status != 'success') {
                        return false;
                    }
                    $log.info("Salvando item " + item.fileName);
                    saveAs(item.data, item.fileName);
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

                function clear() {
                    $log.info('Removendo lista de atividades');
                    for (var i = activityItems.length - 1; i >= 0; i--) {
                        var id = activityItems[i].id;
                        activityItems.splice(i, 1);
                        $indexedDB.openStore(storeName, function (store) {
                            store.delete(id);
                        });
                    }
                    element.addClass(hideClass);
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

                function validateActivities() {
                    $indexedDB.openStore(storeName, function (store) {
                        store.getAll().then(function (objects) {
                            var userIdentity = $rootScope.appContext.identity;
                            angular.forEach(objects, function (item) {
                                if (userIdentity) {
                                    var currentUserLoginHash = CryptoJS.MD5(userIdentity.login).toString();
                                    if (item.activityItem.userLoginHash === currentUserLoginHash) {
                                        activityItems.push(item.activityItem);
                                        return;
                                    }
                                }

                                store.delete(item.id);
                                activityItems = [];
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
    }]).run([function () {

    }]);
});
