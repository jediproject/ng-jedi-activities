'use strict';

define([angular], function(){

	angular.module('jedi.download', []);

	var downloadItems = [];

	angular.module('jedi.download').service('jedi.download.DownloadService', ['$http', function($http){
		this.initDownload = function(baseUrl, apiUrl, params, name){

			var downloadItem = {name: name,status: 'progress'}	;
			downloadItems.push(downloadItem);

			$http.get(baseUrl + apiUrl).success(function(responseData){
				downloadItem.status = 'success';
			}).error(function(responseData){
				downloadItem.status = 'error';
			});
		};
	}]).directive('jdDownload', ['', function(){

		return{
			restrict: 'E',
			replace: true,
			link: function(scope, element){
				element.hide();
				scope.downloadItems = downloadItems;
				scope.$watch(function(){
					return downloadItems.length;
				},
				function(value){
					if (value && value > 0) {
						element.show();
					}
				});
			},
			templateUrl: function(elem, attrs){
				if (attrs.templateUrl) {
					return attrs.templateUrl;
				} else {
					return "assets/libs/ng-jedi-download/download.html";
				}
			},
		}
	}]);
});
