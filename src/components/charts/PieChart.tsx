import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { EventData } from '@/types'; // Import from centralized types

interface PieChartProps {
  data: EventData[];
  width?: number;
  height?: number;
}

const PieChart: React.FC<PieChartProps> = ({ data, width = 300, height = 300 }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null); // Ref for the tooltip div

  useEffect(() => {
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll("*").remove();
      }
      return;
    }

    // Aggregate data: Count events per group (using 'group' field which is actor1)
    const countsByGroup = d3.rollup(
      data,
      v => v.length,
      d => d.group 
    );

    // Sort groups by count, take top N (e.g., top 7) and group others into "Other"
    const sortedGroups = Array.from(countsByGroup, ([group, count]) => ({ group, count }))
      .sort((a, b) => b.count - a.count);

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
    const labelArc = d3.arc<any>().innerRadius(radius * 0.8).outerRadius(radius * 0.8); // Labels further out


    const arcs = g.selectAll('.arc')
      .data(pie(chartData))
      .enter().append('g')
        .attr('class', 'arc');

    arcs.append('path')
      .attr('d', arc)
      .attr('fill', (d: any) => color(d.data.group));

    // Add labels
    arcs.append('text')
      .attr('transform', (d: any) => `translate(${labelArc.centroid(d)})`)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .style('font-size', '9px') // Slightly smaller font
      .style('fill', 'white')
      .text((d: any) => {
        const total = d3.sum(chartData, cd => cd.count);
        const percentage = (d.data.count / total * 100);
        if (percentage < 3) return ""; // Hide label for slices less than 3%
        return `${d.data.group} (${percentage.toFixed(1)}%)`;
      });

  }, [data, width, height]);

  return (
    <div className="bg-slate-700 p-4 rounded-md shadow-lg mt-4">
      <h4 className="text-md font-semibold text-slate-100 mb-2">Event Proportion by Group</h4>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default PieChart;
