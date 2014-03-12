nv.models.multiBar = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var canvas = new Canvas({
          margin : {top: 0, right: 0, bottom: 0, left: 0},
          chartClass: 'multibar'
      })
    , x = d3.scale.ordinal()
    , y = d3.scale.linear()
    , id = Math.floor(Math.random() * 10000) //Create semi-unique ID in case user doesn't select one
    , getX = function(d) { return d.x }
    , getY = function(d) { return d.y }
    , forceY = [0] // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove
    , clipEdge = true
    , stacked = false
    , stackOffset = 'zero' // options include 'silhouette', 'wiggle', 'expand', 'zero', or a custom function
    , color = nv.utils.defaultColor()
    , hideable = false
    , barColor = null // adding the ability to set the color for each rather than the whole group
    , disabled // used in conjunction with barColor to communicate from multiBarHorizontalChart what series are disabled
    , duration = 1000
    , xDomain
    , yDomain
    , xRange
    , yRange
    , groupSpacing = 0.1
    , dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout', 'renderEnd')
    ;

  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var x0, y0 //used to store previous scales
      , renderWatch = nv.utils.renderWatch(dispatch, duration)
      ;


  //============================================================

  function chart(selection) {
    renderWatch.reset();
    selection.each(function(data) {

      canvas.setRoot(this);

      var availableWidth = canvas.available.width,
          availableHeight = canvas.available.height;


      // This function defines the requirements for render complete
      var endFn = function(d, i) {
        if (d.series === data.length - 1 && i === data[0].values.length - 1)
          return true;
        return false;
      }


      if(hideable && data.length) hideable = [{
        values: data[0].values.map(function(d) {
        return {
          x: d.x,
          y: 0,
          series: d.series,
          size: 0.01
        };}
      )}];

      if (stacked)
        data = d3.layout.stack()
                 .offset(stackOffset)
                 .values(function(d){ return d.values })
                 .y(getY)
                 (!data.length && hideable ? hideable : data);

      //add series index to each data point for reference
      data.forEach(function(series, i) {
        series.values.forEach(function(point) {
          point.series = i;
        });
      });

      //------------------------------------------------------------
      // HACK for negative value stacking
      if (stacked)
        data[0].values.map(function(d,i) {
          var posBase = 0, negBase = 0;
          data.map(function(d) {
            var f = d.values[i];
            f.size = Math.abs(f.y);
            if (f.y<0)  {
              f.y1 = negBase;
              negBase = negBase - f.size;
            } else
            {
              f.y1 = f.size + posBase;
              posBase = posBase + f.size;
            }
          });
        });

      //------------------------------------------------------------
      // Setup Scales

      // remap and flatten the data for use in calculating the scales' domains
      var seriesData = (xDomain && yDomain) ? [] : // if we know xDomain and yDomain, no need to calculate
            data.map(function(d) {
              return d.values.map(function(d,i) {
                return { x: getX(d,i), y: getY(d,i), y0: d.y0, y1: d.y1 }
              })
            });

      x.domain(xDomain || d3.merge(seriesData).map(function(d) { return d.x }))
          .rangeBands(xRange || [0, availableWidth], groupSpacing);

      //y.domain(yDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.y + (stacked ? d.y1 : 0) }).concat(forceY)))
      y.domain(yDomain || d3.extent(d3.merge(seriesData).map(function(d) { return stacked ? (d.y > 0 ? d.y1 : d.y1 + d.y ) : d.y }).concat(forceY)))
          .range(yRange || [availableHeight, 0]);

      // If scale's domain don't have a range, slightly adjust to make one... so a chart can show a single data point
      if (x.domain()[0] === x.domain()[1])
        x.domain()[0] ?
            x.domain([x.domain()[0] - x.domain()[0] * 0.01, x.domain()[1] + x.domain()[1] * 0.01])
          : x.domain([-1,1]);

      if (y.domain()[0] === y.domain()[1])
        y.domain()[0] ?
            y.domain([y.domain()[0] + y.domain()[0] * 0.01, y.domain()[1] - y.domain()[1] * 0.01])
          : y.domain([-1,1]);

      x0 = x0 || x;
      y0 = y0 || y;

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      canvas.wrapChart(data);
      canvas.gEnter.append('g').attr('class', 'nv-groups');

      //------------------------------------------------------------

      canvas.defsEnter.append('clipPath')
        .attr('id', 'nv-edge-clip-' + id)
        .append('rect');
      canvas.wrap.select('#nv-edge-clip-' + id + ' rect')
        .attr('width', availableWidth)
        .attr('height', availableHeight);

      canvas.g.attr('clip-path', clipEdge ? 'url(#nv-edge-clip-' + id + ')' : '');

      var groups = canvas.wrap.select('.nv-groups').selectAll('.nv-group')
          .data(function(d) { return d }, function(d,i) { return i });
      groups.enter().append('g')
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6);

      var exitTransition = renderWatch
          .transition(groups.exit().selectAll('rect.nv-bar'), 'multibarExit', Math.min(250, duration))
          .attr('y', function(d) { return stacked ? y0(d.y0) : y0(0) })
          .attr('height', 0)
          .remove();
      if (exitTransition.delay)
          exitTransition.delay(function(d,i) {
            return i * duration / data[0].values.length;
          });

      groups
          .attr('class', function(d,i) { return 'nv-group nv-series-' + i })
          .classed('hover', function(d) { return d.hover })
          .style('fill', function(d,i){ return color(d, i) })
          .style('stroke', function(d,i){ return color(d, i) });
      groups
          .style('stroke-opacity', 1)
          .style('fill-opacity', 0.75);

      var bars = groups.selectAll('rect.nv-bar')
          .data(function(d) { return (hideable && !data.length) ? hideable.values : d.values });

      bars.exit().remove();

      var barsEnter = bars.enter().append('rect')
          .attr('class', function(d,i) { return getY(d,i) < 0 ? 'nv-bar negative' : 'nv-bar positive'})
          .attr('x', function(d,i,j) {
              return stacked ? 0 : (j * x.rangeBand() / data.length )
          })
          .attr('y', function(d) { return y0(stacked ? d.y0 : 0) })
          .attr('height', 0)
          .attr('width', x.rangeBand() / (stacked ? 1 : data.length) )
          .attr('transform', function(d,i) { return 'translate(' + x(getX(d,i)) + ',0)'; });

      function _onMouseEventObject(d,i){
          return {
              value     : getY(d,i),
              point     : d,
              series    : data[d.series],
              pos       : [x(getX(d,i)) + (x.rangeBand() * (stacked ? data.length / 2 : d.series + .5) / data.length), y(getY(d,i) + (stacked ? d.y0 : 0))],  // TODO: Figure out why the value appears to be shifted
              pointIndex: i,
              seriesIndex: d.series,
              e         : d3.event
          }
      }
      bars
          .style('fill', function(d,i,j){ return color(d, j, i);  })
          .style('stroke', function(d,i,j){ return color(d, j, i); })
          .on('mouseover', function(d,i) { //TODO: figure out why j works above, but not here
            d3.select(this).classed('hover', true);
            dispatch.elementMouseover( _onMouseEventObject(d,i) );
          })
          .on('mouseout', function(d,i) {
            d3.select(this).classed('hover', false);
            dispatch.elementMouseout( _onMouseEventObject(d,i) );
          })
          .on('click', function(d,i) {
            dispatch.elementClick( _onMouseEventObject(d,i) );
            d3.event.stopPropagation();
          })
          .on('dblclick', function(d,i) {
            dispatch.elementDblClick( _onMouseEventObject(d,i) );
            d3.event.stopPropagation();
          });
      bars
          .attr('class', function(d,i) { return getY(d,i) < 0 ? 'nv-bar negative' : 'nv-bar positive'})
          .transition()
          .attr('transform', function(d,i) { return 'translate(' + x(getX(d,i)) + ',0)'; });

      function _colorBar(d,i,j) {
        return d3.rgb(barColor(d,i))
            .darker(
                disabled.map(function(d,i) { return i })
                    .filter(function(d,i){ return !disabled[i] })[j]
            )
            .toString()
      }

      if (barColor) {
        if (!disabled)
          disabled = data.map(function() { return true });
        bars
          .style('fill', _colorBar)
          .style('stroke', _colorBar);
      }
      var barSelection =
          bars.watchTransition(renderWatch, 'multibar', Math.min(250, duration))
          .delay(function(d,i) {
            return i * duration / data[0].values.length;
          });
      if (stacked)
          barSelection
            .attr('y', function(d,i) {
              return y((stacked ? d.y1 : 0));
            })
            .attr('height', function(d,i) {
              return Math.max(Math.abs(y(d.y + (stacked ? d.y0 : 0)) - y((stacked ? d.y0 : 0))),1);
            })
            .attr('x', function(d,i) {
              return stacked ? 0 : (d.series * x.rangeBand() / data.length )
            })
            .attr('width', x.rangeBand() / (stacked ? 1 : data.length) );
      else
          barSelection
            .attr('x', function(d,i) {
              return d.series * x.rangeBand() / data.length
            })
            .attr('width', x.rangeBand() / data.length)
            .attr('y', function(d,i) {
              return getY(d,i) < 0 ?
                      y(0) :
                      y(0) - y(getY(d,i)) < 1 ?
                        y(0) - 1 :
                      y(getY(d,i)) || 0;
            })
            .attr('height', function(d,i) {
              return Math.max(Math.abs(y(getY(d,i)) - y(0)),1) || 0;
            });

      //store old scales for use in transitions on update
      x0 = x.copy();
      y0 = y.copy();

    });

    renderWatch.renderEnd('multibar immediate');

    return chart;
  }

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // As a getter, returns a new instance of d3 dispatch and sets appropriate vars.
  // As a setter, sets dispatch.
  // Useful when same chart instance is used to render several data models.
  // Since dispatch is instance-specific, it cannot be contained inside chart model.

  chart.dispatch = dispatch;

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = _;
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) return canvas.margin;
    canvas.margin.top    = typeof _.top    != 'undefined' ? _.top    : canvas.margin.top;
    canvas.margin.right  = typeof _.right  != 'undefined' ? _.right  : canvas.margin.right;
    canvas.margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : canvas.margin.bottom;
    canvas.margin.left   = typeof _.left   != 'undefined' ? _.left   : canvas.margin.left;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return canvas.options.size.width;
      canvas.options.size.width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return canvas.options.size.height;
      canvas.options.size.height = _;
    return chart;
  };

  chart.xScale = function(_) {
    if (!arguments.length) return x;
    x = _;
    return chart;
  };

  chart.yScale = function(_) {
    if (!arguments.length) return y;
    y = _;
    return chart;
  };

  chart.xDomain = function(_) {
    if (!arguments.length) return xDomain;
    xDomain = _;
    return chart;
  };

  chart.yDomain = function(_) {
    if (!arguments.length) return yDomain;
    yDomain = _;
    return chart;
  };

  chart.xRange = function(_) {
    if (!arguments.length) return xRange;
    xRange = _;
    return chart;
  };

  chart.yRange = function(_) {
    if (!arguments.length) return yRange;
    yRange = _;
    return chart;
  };

  chart.forceY = function(_) {
    if (!arguments.length) return forceY;
    forceY = _;
    return chart;
  };

  chart.stacked = function(_) {
    if (!arguments.length) return stacked;
    stacked = _;
    return chart;
  };

  chart.stackOffset = function(_) {
    if (!arguments.length) return stackOffset;
    stackOffset = _;
    return chart;
  };

  chart.clipEdge = function(_) {
    if (!arguments.length) return clipEdge;
    clipEdge = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    return chart;
  };

  chart.barColor = function(_) {
    if (!arguments.length) return barColor;
    barColor = nv.utils.getColor(_);
    return chart;
  };

  chart.disabled = function(_) {
    if (!arguments.length) return disabled;
    disabled = _;
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };

  chart.hideable = function(_) {
    if (!arguments.length) return hideable;
    hideable = _;
    return chart;
  };

  chart.groupSpacing = function(_) {
    if (!arguments.length) return groupSpacing;
    groupSpacing = _;
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) return duration;
    duration = _;
    renderWatch.reset(duration);
    return chart;
  }



  //============================================================
  // Deprecated Methods
  //------------------------------------------------------------

  chart.delay = function(_) {
    nv.deprecated('multiBar.delay');
    return chart.duration(_);
  };

  chart.options = nv.utils.optionsFunc.bind(chart);

  //============================================================

  return chart;
};