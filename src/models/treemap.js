nv.models.treemap = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {
      top: 40,
      right: 10,
      bottom: 10,
      left: 10
    },
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom,
    color = d3.scale.category20c(),
    duration = 250,
    dispatch = d3.dispatch('elementClick', 'elementMouseover', 'elementMouseout', 'renderEnd');

  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var renderWatch = nv.utils.renderWatch(dispatch, duration);

  //============================================================
  function position() {
    this.style("left", function(d) {
        return d.x + "px";
      })
      .style("top", function(d) {
        return d.y + "px";
      })
      .style("width", function(d) {
        return Math.max(0, d.dx - 1) + "px";
      })
      .style("height", function(d) {
        return Math.max(0, d.dy - 1) + "px";
      });
  }

  function chart(selection) {
    renderWatch.reset();
    selection.each(function(data) {
      var container = d3.select(this);

      var treemap = d3.layout.treemap()
        .size([width, height])
        .sticky(true)
        .value(function(d) {
          return d.size;
        });

      var div = container.append("div")
        .style("position", "relative")
        .style("width", (width + margin.left + margin.right) + "px")
        .style("height", (height + margin.top + margin.bottom) + "px")
        .style("left", margin.left + "px")
        .style("top", margin.top + "px");


        var node = div.datum(data).selectAll(".node")
          .data(treemap.nodes)
          .enter().append("div")
          .attr("class", "node")
          .call(position)
          .style("background", function(d) {
            return d.children ? color(d.name) : null;
          })
          .text(function(d) {
            return d.children ? null : d.name;
          });

    });


    renderWatch.renderEnd('treemap immediate');
    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;


  chart.options = nv.utils.optionsFunc.bind(chart);

  chart._options = Object.create({}, {
    // simple options, just get/set the necessary values
    width: {
      get: function() {
        return width;
      },
      set: function(_) {
        width = _;
      }
    },
    height: {
      get: function() {
        return height;
      },
      set: function(_) {
        height = _;
      }
    },
    defined: {
      get: function() {
        return defined;
      },
      set: function(_) {
        defined = _;
      }
    },
    interpolate: {
      get: function() {
        return interpolate;
      },
      set: function(_) {
        interpolate = _;
      }
    },
    clipEdge: {
      get: function() {
        return clipEdge;
      },
      set: function(_) {
        clipEdge = _;
      }
    },

    // options that require extra logic in the setter
    margin: {
      get: function() {
        return margin;
      },
      set: function(_) {
        margin.top = _.top !== undefined ? _.top : margin.top;
        margin.right = _.right !== undefined ? _.right : margin.right;
        margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
        margin.left = _.left !== undefined ? _.left : margin.left;
      }
    },
    duration: {
      get: function() {
        return duration;
      },
      set: function(_) {
        duration = _;
        renderWatch.reset(duration);

      }
    },
    color: {
      get: function() {
        return color;
      },
      set: function(_) {
        color = nv.utils.getColor(_);
          }
    }
  });

  nv.utils.initOptions(chart);

  return chart;
};
