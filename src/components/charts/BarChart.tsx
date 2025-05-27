import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { EventData } from '@/components/visualization/GlobeDisplay'; // Assuming EventData might be useful

interface BarChartProps {
  data: EventData[]; // Or a more specific aggregated data structure
  // Example: data could be [{ year: string, count: number }, ...]
  // For now, we'll assume we need to process EventData to get counts by year
  width?: number;
  height?: number;
}

const BarChart: React.FC<BarChartProps> = ({ data, width = 400, height = 300 }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) {
      // Clear previous chart if data is empty or ref is not available
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll("*").remove();
      }
      return;
    }

    // Aggregate data: Count events per year
    const countsByYear = d3.rollup(
      data,
      v => v.length, // count occurrences
      d => d.date.substring(0, 4) // group by year (extract from YYYY-MM-DD)
    );

    const processedData = Array.from(countsByYear, ([year, count]) => ({ year, count }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year)); // Sort by year

    if (processedData.length === 0) {
        if (svgRef.current) {
            d3.select(svgRef.current).selectAll("*").remove();
            const svg = d3.select(svgRef.current)
                .attr('width', width)
                .attr('height', height);
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .text("No data for selected range.");
        }
        return;
    }
    
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('background-color', '#2d3748') // Dark background for the chart
      .style('color', 'white'); // Default text color

    // Clear previous chart elements
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xScale = d3.scaleBand()
      .domain(processedData.map(d => d.year))
      .range([0, innerWidth])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(processedData, d => d.count) || 0])
      .range([innerHeight, 0]);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X-axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
        .style("fill", "white"); // X-axis text color
    
    // Y-axis
    g.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll("text")
        .style("fill", "white"); // Y-axis text color

    // Bars
    g.selectAll('.bar')
      .data(processedData)
      .enter().append('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.year) || 0)
        .attr('y', d => yScale(d.count))
        .attr('width', xScale.bandwidth())
        .attr('height', d => innerHeight - yScale(d.count))
        .attr('fill', 'steelblue');

  }, [data, width, height]); // Redraw chart if data or dimensions change

  return (
    <div className="bg-slate-700 p-4 rounded-md shadow-lg">
        <h4 className="text-md font-semibold text-slate-100 mb-2">Events per Year</h4>
        <svg ref={svgRef}></svg>
    </div>
  );
};

export default BarChart;
