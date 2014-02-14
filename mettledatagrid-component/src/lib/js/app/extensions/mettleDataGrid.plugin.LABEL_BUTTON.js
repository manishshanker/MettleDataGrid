(function ($) {
    "use strict";

    $.mettleDataGrid = $.extend(true, $.mettleDataGrid, {
        plugin: {
            LABEL_BUTTON: function ($mettleDataGrid, options, cachedData) {

                options = $.extend({
                    labelButtonIdentifier: ".button"
                }, options);

                function load() {
                    $mettleDataGrid.delegate(options.labelButtonIdentifier, "click", function () {
                        var rowId = $.mettleDataGrid.getElementId($(this).closest(".row").attr("id"));
                        alert("Cell data: " + $(this).next().val() + ", Row data: " + JSON.stringify(cachedData[rowId]));
                        return false;
                    });
                }

                function update(_cachedData) {
                    cachedData = _cachedData;
                }

                function destroy() {
                    $mettleDataGrid.undelegate(options.labelButtonIdentifier, "click");
                    options = null;
                }

                return {
                    load: load,
                    update: update,
                    destroy: destroy
                };
            }
        }
    });

}(jQuery));