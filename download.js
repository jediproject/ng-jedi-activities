'use strict';

define([], function(){

	angular.module('jedi.download', []);

	angular.module('jedi.download').service('jedi.download.DownloadService', ['$http', function($http){
		this.initDownload = function(baseUrl, apiUrl, params, name){
			$http.get(baseUrl + apiUrl).success(function(responseData){

			}).error(function(responseData){

			});
		};
	}]);
});
