'use strict';

define(['angular', 'file-saver-saveas-js', 'angular-indexed-db'], function () {

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

    angular.module('jedi.activities').service('jedi.activities.ActivitiesService', ['$http', '$rootScope', '$timeout', '$indexedDB', '$log', function ($http, $rootScope, $timeout, $indexedDB, $log) {

        this.initActivity = function (baseUrl, apiUrl, method, params, name) {

            var counter = 0;
            var timeout = $timeout(onTimeout, 1000);
            var date = new Date(0, 0, 0, 0, 0, 0);

            var onTimeout = function () {
                counter++;
                date.setSeconds(counter);
                activityItem.duration = "(" + ("0" + date.getMinutes()).slice(-2) + ":" + ("0" + date.getSeconds()).slice(-2) + ")";
                timeout = $timeout(onTimeout, 1000);

                if (activityItem.status != 'progress') {
                    $timeout.cancel(timeout);
                }
            };

            var activityItem = {
                id: guid(),
                fileName: name,
                status: 'progress',
                duration: date.getHours().toString() + ":" + date.getMinutes().toString()
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

            $http(request).success(function (data, status, headers, config) {

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
        };

        this.clearActivities = function clearActivities() {
            $rootScope.$broadcast('jedi.activity.clearActivities');
        };

        this.toggle = function toggleMonitor() {
            $rootScope.$broadcast('jedi.activity.toggleMonitor');
        };

        function insertToIndexedDb(item) {
            $indexedDB.openStore(storeName, function (store) {
                store.insert({ "id": item.id, "activityItem": item }).then(function (e) {
                    $log.info('Inserindo atividade id: ' + e);
                });

                store.getAll().then(function (people) {
                    var teste = people;
                });
            });
        };

    }]).directive('jdActivity', ['$log', function ($log) {

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
                        } else {
                            element.addClass(hideClass);
                        }
                    });

                scope.$on('$destroy', function () {
                    element.remove();
                });

                scope.$on('jedi.activity.clearActivities', activitiesCtrl.clear);

                scope.$on('jedi.activity.toggleMonitor', activitiesCtrl.toggle);
            },
            controller: ['$scope', '$attrs', '$element', '$timeout', '$log', '$indexedDB', function Controller(scope, attrs, element, $timeout, $log, $indexedDB) {

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

                initCtrl();

                function initCtrl() {
                    scope.activityItems = activityItems;
                }

                function removeIconClick(item) {
                    if (item.status == 'progress') {
                        return false;
                    }
                    $log.info("Removendo item " + item.name);
                    var index = activityItems.indexOf(item);
                    activityItems.splice(index, 1);
                    $indexedDB.openStore(storeName, function (store) {
                        store.delete(item.id);
                    });
                }

                function saveIconClick(item) {
                    if (item.status != 'success') {
                        return false;
                    }
                    $log.info("Salvando item " + item.fileName);
                    saveAs(item.data, item.fileName);
                }

                function refresh() {
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
    }]).run(['$indexedDB', function ($indexedDB) {
        $indexedDB.openStore(storeName, function (store) {
            store.getAll().then(function (objects) {
                angular.forEach(objects, function (item) {
                    activityItems.push(item.activityItem);
                });
            });
        });
    }]);
});
