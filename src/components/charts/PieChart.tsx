import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { EventData, GroupCount } from '@/types'; 

function isEventDataArrayForPie(data: EventData[] | GroupCount[]): data is EventData[] {
  return data.length > 0 && (data[0] as EventData).date !== undefined;
}

interface PieChartProps {
  data: EventData[] | GroupCount[];
  width?: number;
  height?: number;
}

const PieChart: React.FC<PieChartProps> = ({ data, width = 300, height = 300 }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);


  useEffect(() => {
    if (!svgRef.current) { // gotta have the svg element to draw on
        return;
    }

    // manage the tooltip div that's appended to the body
    // try to reuse it if one already exists from another chart instance, maybe?
    // this could be a bit tricky if multiple pie charts are on the page
    // but for now, one global '.chart-tooltip' should be okay maybe idk bruh
    let tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>; 
    
    const existingTooltip = d3.select("body").select<HTMLDivElement>(".chart-tooltip"); 
    if (existingTooltip.empty()) {
      tooltip = d3.select("body").append<HTMLDivElement>("div") 
        .attr("class", "chart-tooltip") // using a class so we can find it again
        .style('position', 'absolute')
        .style('background-color', 'rgba(0,0,0,0.8)') 
        .style('color', 'white')
        .style('padding', '5px 10px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('pointer-events', 'none') // so it doesn't steal mouse events from the chart
        .style('opacity', 0) // hidden by default
        .style('z-index', '100'); // make sure it's on top
    } else {
      tooltip = existingTooltip; 
    }

    if (!data || data.length === 0) { 
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll("*").remove(); // clear the svg if no data
      }
      if (tooltip) tooltip.style('opacity', 0); // hide tooltip too
      return;
    }

    let aggregatedData: { group: string, count: number }[];

    if (isEventDataArrayForPie(data)) {
      // if we got raw EventData, we need to roll it up by group
      const countsByGroup = d3.rollup(
        data, 
        v => v.length,
        d => d.group 
      );
      aggregatedData = Array.from(countsByGroup, ([group, count]) => ({ group, count }));
    } else {
      // if we got GroupCount[], it's already aggregated
      aggregatedData = [...data]; 
    }

    const sortedGroups = [...aggregatedData].sort((a, b) => b.count - a.count);

    const TOP_N_GROUPS = 7; // how many slices before we group into "Other"
    let chartData;
    if (sortedGroups.length > TOP_N_GROUPS) {
      const topGroups = sortedGroups.slice(0, TOP_N_GROUPS);
      const otherCount = sortedGroups.slice(TOP_N_GROUPS).reduce((acc, curr) => acc + curr.count, 0);
      chartData = [...topGroups, { group: "Other", count: otherCount }];
    } else {
      chartData = sortedGroups;
    }
    
    if (chartData.length === 0 || chartData.every(d => d.count === 0)) {
        if (svgRef.current) {
            d3.select(svgRef.current).selectAll("*").remove();
            const svg = d3.select(svgRef.current).attr('width', width).attr('height', height);
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .style("fill", "white")
                .text("No group data for selected range.");
        }
        return;
    }

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('background-color', '#2d3748')
      .style('color', 'white');

    svg.selectAll("*").remove();

    const radius = Math.min(width, height) / 2 - 10;
    const g = svg.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const color = d3.scaleOrdinal(d3.schemeCategory10); 

    const pie = d3.pie<any>().value(d => d.count).sort(null); 
    const arcGenerator = d3.arc<any>().innerRadius(radius * 0.5).outerRadius(radius); // for donut slices
    const labelArcGenerator = d3.arc<any>().innerRadius(radius * 0.8).outerRadius(radius * 0.8); 


    const arcs = g.selectAll('.arc')
      .data(pie(chartData)) 
      .enter().append('g')
        .attr('class', 'arc');

    arcs.append('path')
      .attr('d', arcGenerator) 
      .attr('fill', (d: any) => color(d.data.group))
      .on('mouseover', function (event, d: any) {
        tooltip.transition().duration(200).style('opacity', 0.9);
        const total = d3.sum(chartData, cd => cd.count);
        const percentage = (d.data.count / total * 100).toFixed(1);
        tooltip.html(`<strong>${d.data.group}</strong><br/>Count: ${d.data.count}<br/>Percentage: ${percentage}%`)
          .style('left', (event.pageX + 15) + 'px') 
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mousemove', function (event) { 
        tooltip.style('left', (event.pageX + 15) + 'px')
               .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function () {
        tooltip.transition().duration(500).style('opacity', 0);
      });

    // add labels to the pie slices
    arcs.append('text')
      .attr('transform', (d: any) => `translate(${labelArcGenerator.centroid(d)})`)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .style('font-size', '9px') 
      .style('fill', 'white')
      .style('pointer-events', 'none') // labels shouldn't block mouse events on slices
      .text((d: any) => {
        const total = d3.sum(chartData, cd => cd.count);
        const percentage = (d.data.count / total * 100);
        if (percentage < 5) return ""; 
        
        let groupName = d.data.group;
        // a bit of logic to truncate long names if there are many slices to prevent clutter
        if (groupName.length > 10 && chartData.length > 5) { 
            groupName = groupName.substring(0, 8) + "...";
        }
        return `${groupName} (${percentage.toFixed(0)}%)`; // show integer percentage for labels
      });
    
    // cleanup when the component unmounts or data changes
    return () => {

      if (tooltip && tooltip.classed("chart-tooltip")) { 
          tooltip.style('opacity', 0);
      }
    };

  }, [data, width, height]);

  return (
    <div className="bg-slate-700 p-4 rounded-md shadow-lg mt-4"> 
      <h4 className="text-md font-semibold text-slate-100 mb-2">Event Proportion by Group</h4>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default React.memo(PieChart);
