'use strict';

define(['angular', 'file-saver-saveas-js', 'angular-local-storage'], function () {

    angular.module('jedi.download', []);

    var downloadItems = [];

    function guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                       .toString(16)
                       .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
          s4() + '-' + s4() + s4() + s4();
    }

    angular.module('jedi.download').service('jedi.download.DownloadService', ['$http', 'localStorageService', function ($http, localStorageService) {
        this.initDownload = function (baseUrl, apiUrl, method, params, name) {

            //if (!localStorageService.get('downloads')) {
            //  localStorageService.set('downloads', downloadItems)
            //}

            var downloadItem = {
                id: guid(),
                name: name,
                status: 'progress'
            };

            downloadItems.push(downloadItem);

            var request = {
                method: method.toUpperCase(),
                url: baseUrl + '/' + apiUrl,
                data: params,
                config: { responseType: 'arraybuffer', ignoreLoadingBar: true, showLoadingModal: true }
            };

            $http(request).success(function (data, status, headers, config) {

                var contentDisposition = headers("content-disposition");
                var filename = contentDisposition.substring((contentDisposition.indexOf('filename=') + 9));
                //saveAs(blob, filename);

                downloadItem.status = 'success';
                downloadItem.fileName = filename;
                downloadItem.data = new Blob([data], { type: headers("content-type") });;
                localStorageService.set('download-' + downloadItem.id, downloadItem)
            }).error(function (data, status) {
                downloadItem.status = 'error';
                downloadItem.data = null;
                localStorageService.set('download-' + downloadItem.id, downloadItem)
            });
        };
    }]).directive('jdDownload', [function () {

        return {
            restrict: 'E',
            replace: true,
            link: function (scope, element) {
                element.hide();
                scope.$watch(function () {
                    return downloadItems.length;
                },
                    function (value) {
                        if (value && value > 0) {
                            element.show();
                        }
                        else {
                            element.hide();
                        }
                    });

                scope.$on('$destroy', function () {
                    element.remove();
                });
            },
            controller: ['$scope', '$attrs', '$element', '$timeout', 'localStorageService', function Controller($scope, $attrs, $element, $timeout, localStorageService) {
                var vm = this;

                vm.successIconClick = successIconClick;
                vm.errorIconClick = errorIconClick;
                vm.removeIconClick = removeIconClick;
                vm.saveIconClick = saveIconClick;

                initCtrl();

                function initCtrl() {
                    $scope.downloadItems = downloadItems;
                }

                function successIconClick(item) {
                    console.log("clicked with item " + item.name);
                }

                function errorIconClick(item) {
                    console.log("clicked with item " + item.name);
                }

                function removeIconClick(item) {
                    var index = downloadItems.indexOf(item);
                    downloadItems.splice(index, 1);
                    localStorageService.remove('download-' + item.id)
                }

                function saveIconClick(item) {
                    saveAs(item.data, item.fileName);
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
    }]).run(['localStorageService', function (localStorageService) {

        var lsKeys = localStorageService.keys();

        angular.forEach(lsKeys, function (key) {
            if (key.toLowerCase().indexOf('download-') > -1) {
                downloadItems.push(localStorageService.get(key));
            }
        });

    }]);
});
