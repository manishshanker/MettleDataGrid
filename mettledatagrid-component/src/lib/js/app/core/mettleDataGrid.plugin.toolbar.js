/**
 * Copyright 2011-2014 Manish Shanker
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @author Manish Shanker
 */

(function ($) {
    "use strict";

    var toolbarContainer = {};

    $.mettleDataGrid = $.extend(true, $.mettleDataGrid, {
        plugin: {
            toolbar: function ($mettleDataGrid, options) {

                options = $.extend({
                    showToolbar: true,
                    toolbarTemplate: "<div class='mettleDataGrid-toolbar'><a href='#' class='mettleDataGrid-reset'>Reset</a><a href='#' class='mettleDataGrid-refresh'>Refresh</a></div>",
                    onReset: $.noop
                }, options);

                var $toolbar;

                function load() {
                    if (!options.showToolbar) {
                        return;
                    }
                    $toolbar = $(options.toolbarTemplate);
                    toolbarContainer[options.id] = $toolbar;
                    $mettleDataGrid.prepend($toolbar);
                    $mettleDataGrid.undelegate(".mettleDataGrid-reset", "click").delegate(".mettleDataGrid-reset", "click", function () {
                        options.onReset();
                        return false;
                    });
                    $mettleDataGrid.undelegate(".mettleDataGrid-refresh", "click").delegate(".mettleDataGrid-refresh", "click", function () {
                        options.onRefresh();
                        return false;
                    });
                }

                function destroy() {
                    delete toolbarContainer[options.id];
                    if ($toolbar) {
                        $mettleDataGrid.undelegate(".mettleDataGrid-reset", "click");
                        $mettleDataGrid.undelegate(".mettleDataGrid-refresh", "click");
                    }
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