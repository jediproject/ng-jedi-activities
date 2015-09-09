'use strict';

define(['angular', 'file-saver-saveas-js', 'angular-indexed-db'], function () {

    var downloadItems = [];
    var hideClass = 'hideMe';
    var minimizeClass = 'minimizeMe';
    var storeName = 'downloadItems';

    function guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }

    angular.module('jedi.download', []).config(['$indexedDBProvider', function ($indexedDBProvider) {
        $indexedDBProvider
            .connection('downloads')
            .upgradeDatabase(1, function (event, db, tx) {
                var objStore = db.createObjectStore('downloadItems', { keyPath: 'id' });
            });
    }]);

    angular.module('jedi.download').service('jedi.download.DownloadService', ['$http', '$rootScope', '$indexedDB', '$log', function ($http, $rootScope, $indexedDB, $log) {
        this.initDownload = function (baseUrl, apiUrl, method, params, name) {

            var downloadItem = {
                id: guid(),
                fileName: name,
                status: 'progress'
            };

            downloadItems.push(downloadItem);

            var request = {
                method: method.toUpperCase(),
                url: baseUrl + '/' + apiUrl,
                data: params,
                responseType: 'arraybuffer',
                ignoreLoadingBar: true,
                showLoadingModal: false
            };

            $http(request).success(function (data, status, headers, config) {

                var contentDisposition = headers("content-disposition");
                var filename = contentDisposition.substring((contentDisposition.indexOf('filename=') + 9));

                downloadItem.status = 'success';
                downloadItem.fileName = filename;
                downloadItem.data = new Blob([data], { type: headers("content-type") });

                insertToIndexedDb(downloadItem);
            }).error(function (data, status) {
                downloadItem.status = 'error';
                downloadItem.data = null;

                insertToIndexedDb(downloadItem);
            });
        };

        this.clearDownloads = function clearDownloads() {
            $rootScope.$broadcast('jedi.download.ClearDownloads');
        };

        this.toggle = function toggleMonitor() {
            $rootScope.$broadcast('jedi.download.toggleMonitor');
        };

        function insertToIndexedDb(item) {
            $indexedDB.openStore(storeName, function (store) {
                store.insert({ "id": item.id, "downloadItem": item }).then(function (e) {
                    $log.info('Inserindo download id: ' + e);
                });

                store.getAll().then(function (people) {
                    var teste = people;
                });
            });
        };

    }]).directive('jdDownload', ['$log', function ($log) {

        return {
            restrict: 'E',
            replace: true,
            link: function (scope, element, attrs, activitiesCtrl) {
                scope.$watch(function () {
                    return downloadItems.length;
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

                scope.$on('jedi.download.ClearDownloads', activitiesCtrl.clear);

                scope.$on('jedi.download.toggleMonitor', activitiesCtrl.toggle);
            },
            controller: ['$scope', '$attrs', '$element', '$timeout', '$log', '$indexedDB', function Controller(scope, attrs, element, $timeout, $log, $indexedDB) {

                $log.info(downloadItems.length);

                var vm = this;
                vm.downloadsModel = {
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
                    scope.downloadItems = downloadItems;
                }

                function removeIconClick(item) {
                    if (item.status == 'progress') {
                        return false;
                    }
                    $log.info("Removendo item " + item.name);
                    var index = downloadItems.indexOf(item);
                    downloadItems.splice(index, 1);
                    $indexedDB.openStore('downloadItems', function (store) {
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
                    return downloadItems && downloadItems.length > 0;
                }

                function clear() {
                    for (var i = downloadItems.length - 1; i >= 0; i--) {
                        var id = downloadItems[i].id;
                        downloadItems.splice(i, 1);
                        $indexedDB.openStore('downloadItems', function (store) {
                            store.delete(id);
                        });
                    }
                    $log.info('Lista de Downloads removida');
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
                    return "assets/libs/ng-jedi-download/download.html";
                }
            },
        };
    }]).run(['$indexedDB', function ($indexedDB) {
        $indexedDB.openStore('downloadItems', function (store) {
            store.getAll().then(function (objects) {
                angular.forEach(objects, function (item) {
                    downloadItems.push(item.downloadItem);
                });
            });
        });
    }]);
});
