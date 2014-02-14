(function ($) {
    "use strict";

    var currentTheme = {};

    $.mettleDataGrid = $.extend(true, $.mettleDataGrid, {
        plugin: {
            THEME_SWITCHER: function ($mettleDataGrid, options) {
                console.log("called")
                function load() {
                    var $themeSwitcher = $("." + options.id + "-mettleDataGrid-switch-theme");
                    $themeSwitcher.delegate(".theme", "click", function () {
                        var theme = $(this).attr("href").replace("#", ""), gridId = options.id;
                        var $grid = $("#" + gridId);
                        var $gridGroupBy = $("." + gridId + "-mettleDataGrid-group-by");
                        if (currentTheme[gridId]) {
                            $grid.removeClass("mettleDataGrid-" + currentTheme[gridId]);
                            $gridGroupBy.removeClass("mettleDataGrid-group-by-" + currentTheme[gridId]);
                        }
                        currentTheme[gridId] = theme;
                        $grid.addClass("mettleDataGrid-" + currentTheme[gridId]);
                        $gridGroupBy.addClass("mettleDataGrid-group-by-" + currentTheme[gridId]);
                        return false;
                    });
                }

                function destroy() {
                    $("." + options.id + "-mettleDataGrid-switch-theme").undelegate(".theme", "click");
                    options = null;
                }

                return {
                    load: load,
                    destroy: destroy
                };
            }
        }
    });

}(jQuery));