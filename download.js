'use strict';

define(['angular'], function () {

    angular.module('jedi.download', []);

    var downloadItems = [];

    angular.module('jedi.download').service('jedi.download.DownloadService', ['$http', function ($http) {
        this.initDownload = function (baseUrl, apiUrl, method, params, name) {

            var downloadItem = { name: name, status: 'progress' };

            for (var i = 0; i < 20; i++) {
                downloadItems.push(downloadItem);
            }

            var request = {
                method: method.toUpperCase(),
                url: baseUrl + '/' + apiUrl,
                data: params
            };

            $http(request).success(function (responseData) {
                downloadItem.status = 'success';
            }).error(function (responseData) {
                downloadItem.status = 'error';
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
                });

                scope.$on('$destroy', function () {
                    element.remove();
                });
            },
            controller: ['$scope', '$attrs', '$element', '$timeout', function Controller($scope, $attrs, $element, $timeout) {
                $scope.downloadItems = downloadItems;
            }],
            templateUrl: function (elem, attrs) {
                if (attrs.templateUrl) {
                    return attrs.templateUrl;
                } else {
                    return "assets/libs/ng-jedi-download/download.html";
                }
            },
        };
    }]);
});
