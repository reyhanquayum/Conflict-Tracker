import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { EventTypeCount } from '@/types';

interface EventTypesPieChartProps {
  data: EventTypeCount[];
  title?: string; // Optional title for the chart
  width?: number;
  height?: number;
}

const EventTypesPieChart: React.FC<EventTypesPieChartProps> = ({ data, title = "Event Types", width = 300, height = 250 }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    let tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;
    const existingTooltip = d3.select("body").select<HTMLDivElement>(".chart-tooltip-eventtype"); // Use a different class
    if (existingTooltip.empty()) {
      tooltip = d3.select("body").append<HTMLDivElement>("div")
        .attr("class", "chart-tooltip-eventtype")
        .style('position', 'absolute')
        .style('background-color', 'rgba(0,0,0,0.8)')
        .style('color', 'white')
        .style('padding', '5px 10px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('opacity', 0)
        .style('z-index', '100');
    } else {
      tooltip = existingTooltip;
    }

    if (!data || data.length === 0) {
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll("*").remove();
         const svg = d3.select(svgRef.current).attr('width', width).attr('height', height);
         svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .style("fill", "white")
            .text("No event type data.");
      }
      if (tooltip) tooltip.style('opacity', 0);
      return;
    }

    const chartDataInput = [...data].sort((a, b) => b.count - a.count);

    const TOP_N_TYPES = 7;
    let chartData;
    if (chartDataInput.length > TOP_N_TYPES) {
      const topTypes = chartDataInput.slice(0, TOP_N_TYPES);
      const otherCount = chartDataInput.slice(TOP_N_TYPES).reduce((acc, curr) => acc + curr.count, 0);
      chartData = [...topTypes, { type: "Other Event Types", count: otherCount }];
    } else {
      chartData = chartDataInput;
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
                .text("No event type data.");
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

    const color = d3.scaleOrdinal(d3.schemeTableau10); // Different color scheme

    const pie = d3.pie<any>().value((d: any) => d.count).sort(null);
    const arcGenerator = d3.arc<any>().innerRadius(radius * 0.5).outerRadius(radius);
    const labelArcGenerator = d3.arc<any>().innerRadius(radius * 0.8).outerRadius(radius * 0.8);

    const arcs = g.selectAll('.arc')
      .data(pie(chartData))
      .enter().append('g')
        .attr('class', 'arc');

    arcs.append('path')
      .attr('d', arcGenerator)
      .attr('fill', (d: any) => color(d.data.type))
      .on('mouseover', function (event, d: any) {
        tooltip.transition().duration(200).style('opacity', 0.9);
        const total = d3.sum(chartData, cd => cd.count);
        const percentage = (d.data.count / total * 100).toFixed(1);
        tooltip.html(`<strong>${d.data.type}</strong><br/>Count: ${d.data.count}<br/>Percentage: ${percentage}%`)
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

    arcs.append('text')
      .attr('transform', (d: any) => `translate(${labelArcGenerator.centroid(d)})`)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .style('font-size', '9px')
      .style('fill', 'white')
      .style('pointer-events', 'none')
      .text((d: any) => {
        const total = d3.sum(chartData, cd => cd.count);
        const percentage = (d.data.count / total * 100);
        if (percentage < 5) return "";
        
        let typeName = d.data.type;
        if (typeName.length > 12 && chartData.length > 4) { 
            typeName = typeName.substring(0, 10) + "...";
        }
        return `${typeName} (${percentage.toFixed(0)}%)`;
      });
    
    return () => {
      if (tooltip && tooltip.classed("chart-tooltip-eventtype")) {
          tooltip.style('opacity', 0); // Just hide, don't remove if shared
      }
    };

  }, [data, width, height]);

  return (
    <div className="bg-slate-700 p-4 rounded-md shadow-lg mt-4"> 
      <h4 className="text-md font-semibold text-slate-100 mb-2">{title}</h4>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default React.memo(EventTypesPieChart);
