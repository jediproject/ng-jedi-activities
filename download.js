'use strict';

define(['angular', 'angular-local-storage'], function() {

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

    angular.module('jedi.download').service('jedi.download.DownloadService', ['$http', 'LocalStorageService', function($http, localStorageService) {
        this.initDownload = function(baseUrl, apiUrl, method, params, name) {

           if (!localStorageService.get('downloads')) {
             localStorageService.set('downloads', downloadItems)
           }

            var downloadItem = {
                downloadItem.id = guid(),
                name: name,
                status: 'progress'
            };

            downloadItems.push(downloadItem);

            var request = {
                method: method.toUpperCase(),
                url: baseUrl + '/' + apiUrl,
                data: params
            };

            $http(request).success(function(responseData) {
                downloadItem.status = 'success';
                downloadItem.data = responseData;
            }).error(function(responseData) {
                downloadItem.status = 'error';
            });
        };
    }]).directive('jdDownload', [function() {

        return {
            restrict: 'E',
            replace: true,
            link: function(scope, element) {
                element.hide();
                scope.$watch(function() {
                        return downloadItems.length;
                    },
                    function(value) {
                        if (value && value > 0) {
                            element.show();
                        }
                    });

                scope.$on('$destroy', function() {
                    element.remove();
                });
            },
            controller: ['$scope', '$attrs', '$element', '$timeout', function Controller($scope, $attrs, $element, $timeout) {
                var vm = this;

                vm.successIconClick = successIconClick;
                vm.errorIconClick = errorIconClick;
                vm.removeIconClick = removeIconClick;

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

                function removeIconClick(index){
                  console.console.log("removing item id: " + item.id);
                  downloadItems.splice(index, 1);
                }
            }],
            controllerAs: 'activitiesCtrl',
            bindToController: true,
            templateUrl: function(elem, attrs) {
                if (attrs.templateUrl) {
                    return attrs.templateUrl;
                } else {
                    return "assets/libs/ng-jedi-download/download.html";
                }
            },
        };
    }]);
});
