(function ($) {
    "use strict";

    $.mettleDataGrid.renderer.TEXT = {
        cell: function (data) {
            return data;
        },
        comparator: function (valA, valB) {
            return valA < valB ? -1 : (valA > valB ? 1 : 0);
        }
    };

}(jQuery));