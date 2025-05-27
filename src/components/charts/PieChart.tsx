import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { EventData, GroupCount } from '@/types'; 

// Type guard to check if data is EventData[]
function isEventDataArrayForPie(data: EventData[] | GroupCount[]): data is EventData[] {
  // Check if the first element has a 'date' property, typical of EventData
  return data.length > 0 && (data[0] as EventData).date !== undefined;
}

interface PieChartProps {
  data: EventData[] | GroupCount[];
  width?: number;
  height?: number;
}

const PieChart: React.FC<PieChartProps> = ({ data, width = 300, height = 300 }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  // Tooltip div will be created and removed by D3, no React ref needed for it here.

  useEffect(() => {
    // Ensure svgRef is current before proceeding
    if (!svgRef.current) return;

    // Tooltip div - create it if it doesn't exist, then select
    let tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>; // Explicitly type tooltip
    
    const existingTooltip = d3.select("body").select<HTMLDivElement>(".chart-tooltip"); // Use select<HTMLDivElement>
    if (existingTooltip.empty()) {
      tooltip = d3.select("body").append<HTMLDivElement>("div") 
        .attr("class", "chart-tooltip") 
        .style('position', 'absolute')
        .style('background-color', 'rgba(0,0,0,0.8)') // Slightly darker for better contrast
        .style('color', 'white')
        .style('padding', '5px 10px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('pointer-events', 'none') 
        .style('opacity', 0)
        .style('z-index', '100'); 
    } else {
      tooltip = existingTooltip; // Assign existing to tooltip variable
    }

    if (!data || data.length === 0) { 
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll("*").remove();
      }
      if (tooltip) tooltip.style('opacity', 0); // Check if tooltip is assigned
      return;
    }

    let aggregatedData: { group: string, count: number }[];

    if (isEventDataArrayForPie(data)) {
      // Aggregate EventData[]: Count events per group
      const countsByGroup = d3.rollup(
        data, // data is EventData[]
        v => v.length,
        d => d.group // d is EventData
      );
      aggregatedData = Array.from(countsByGroup, ([group, count]) => ({ group, count }));
    } else {
      // Data is already GroupCount[]
      aggregatedData = [...data]; // data is GroupCount[]
    }

    // Sort groups by count, take top N (e.g., top 7) and group others into "Other"
    const sortedGroups = [...aggregatedData].sort((a, b) => b.count - a.count);

    const TOP_N_GROUPS = 7;
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
      .style('background-color', '#2d3748') // Match BarChart background
      .style('color', 'white');

    svg.selectAll("*").remove(); // Clear previous chart

    const radius = Math.min(width, height) / 2 - 10; // Margin of 10
    const g = svg.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const color = d3.scaleOrdinal(d3.schemeCategory10); // Color scheme

    const pie = d3.pie<any>().value(d => d.count).sort(null); // Disable default sorting by value
    const arc = d3.arc<any>().innerRadius(radius * 0.5).outerRadius(radius); // Make a donut for labels
    const labelArc = d3.arc<any>().innerRadius(radius * 0.8).outerRadius(radius * 0.8); 

    // Tooltip is already selected/created above

    const arcs = g.selectAll('.arc')
      .data(pie(chartData))
      .enter().append('g')
        .attr('class', 'arc');

    arcs.append('path')
      .attr('d', arc)
      .attr('fill', (d: any) => color(d.data.group))
      .on('mouseover', function (event, d: any) {
        tooltip.transition().duration(200).style('opacity', 0.9);
        const total = d3.sum(chartData, cd => cd.count);
        const percentage = (d.data.count / total * 100).toFixed(1);
        tooltip.html(`<strong>${d.data.group}</strong><br/>Count: ${d.data.count}<br/>Percentage: ${percentage}%`)
          .style('left', (event.pageX + 15) + 'px') // Position tooltip near mouse
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mousemove', function (event) { // Keep tooltip near mouse
        tooltip.style('left', (event.pageX + 15) + 'px')
               .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function () {
        tooltip.transition().duration(500).style('opacity', 0);
      });

    // Add labels
    arcs.append('text')
      .attr('transform', (d: any) => `translate(${labelArc.centroid(d)})`)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .style('font-size', '9px') 
      .style('fill', 'white')
      .style('pointer-events', 'none') // So labels don't block mouseover on slices
      .text((d: any) => {
        const total = d3.sum(chartData, cd => cd.count);
        const percentage = (d.data.count / total * 100);
        if (percentage < 5) return ""; // Hide label for slices less than 5% (tooltip will cover)
        
        let groupName = d.data.group;
        if (groupName.length > 10 && chartData.length > 5) { // Truncate if name is long and many slices
            groupName = groupName.substring(0, 8) + "...";
        }
        return `${groupName} (${percentage.toFixed(0)}%)`;
      });
    
    // Cleanup function for useEffect
    return () => {
      // If the tooltip was created by this instance and is still on the body, remove it.
      // This is a simple cleanup. A more robust system might involve checking if other charts
      // are active or using a ref count for the body-appended tooltip.
      // For now, let's assume this component "owns" the .chart-tooltip if it created it.
      // A safer approach for cleanup if multiple charts could exist:
      if (tooltip && tooltip.classed("chart-tooltip")) { // Check if it's our tooltip
          // Check if this component instance was the one that created it,
          // or simply hide it to allow other instances to use it.
          // For simplicity now, just hide. If issues arise with multiple charts,
          // we'd need a more sophisticated shared tooltip or unique IDs.
          tooltip.style('opacity', 0);
      }
      // If we want to ensure it's removed if this component created it:
      // This requires a flag, e.g., `let tooltipCreatedByThisInstance = false;`
      // if (tooltipCreatedByThisInstance && tooltip) { tooltip.remove(); }
    };

  }, [data, width, height]);

  return (
    <div className="bg-slate-700 p-4 rounded-md shadow-lg mt-4"> {/* No longer needs relative positioning for tooltip */}
      <h4 className="text-md font-semibold text-slate-100 mb-2">Event Proportion by Group</h4>
      <svg ref={svgRef}></svg>
      {/* Tooltip div is now appended to body by D3 */}
    </div>
  );
};

export default PieChart;
