import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { EventData, YearlyCount } from '@/types'; 

// Type guard to check if data is EventData[]
function isEventDataArray(data: EventData[] | YearlyCount[]): data is EventData[] {
  // Check if the first element has a 'date' property, typical of EventData
  // and not present in YearlyCount. Assumes non-empty array for this check.
  return data.length > 0 && (data[0] as EventData).date !== undefined;
}

interface BarChartProps {
  data: EventData[] | YearlyCount[]; 
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

    let processedData: YearlyCount[];

    if (isEventDataArray(data)) {
      // Aggregate EventData[]: Count events per year
      const countsByYear = d3.rollup(
        data, // data is EventData[] here
        v => v.length, 
        d => { // d is EventData
          const parts = d.date.split(' ');
          return parts.length > 2 ? parts[parts.length - 1] : "Unknown"; 
        }
      );
      processedData = Array.from(countsByYear, ([year, count]) => ({ year, count }))
        .sort((a, b) => parseInt(a.year) - parseInt(b.year));
    } else {
      // Data is already YearlyCount[], just sort it
      // Ensure year is string for sorting, though it should be from API
      processedData = [...data].sort((a, b) => parseInt(String(a.year)) - parseInt(String(b.year)));
    }

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

    const margin = { top: 20, right: 30, bottom: 60, left: 70 }; // Increased bottom and left margin for labels
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
    const allYears = processedData.map(d => d.year);
    let tickValues = allYears;
    const maxTicks = Math.max(2, Math.floor(innerWidth / 50)); // Aim for a tick every ~50px

    if (allYears.length > maxTicks) {
      // If too many years, select a subset of tick values
      const nth = Math.ceil(allYears.length / maxTicks);
      tickValues = allYears.filter((_, i) => i % nth === 0);
    }
    console.log('Calculated tickValues for X-Axis:', tickValues); 
    console.log('xScale domain:', xScale.domain()); // Log the xScale's domain

    const xAxis = d3.axisBottom(xScale)
      .tickValues(tickValues) 
      .tickFormat(() => ""); // Set an empty tick format, as we'll manually set text

    const xAxisGroup = g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    // Manually set text for each tick to ensure correct year string
    xAxisGroup.selectAll(".tick") // Select each <g class="tick"> element
      .select("text") // Select the text element within it
      .text(d => {
        console.log('Manual tick text - datum (d):', d, 'Type:', typeof d); // For debugging
        return String(d); // d should be the year string from tickValues
      });

    // Apply styling to all tick text elements (including those just set)
    xAxisGroup.selectAll("text")
        .style("fill", "white")
        .style("font-size", "9px") 
        .attr("transform", "rotate(-35)") 
        .attr("text-anchor", "end")       
        .attr("dx", "-.8em")              
        .attr("dy", ".15em");
    
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

    // X Axis Label
    svg.append("text")
        .attr("class", "x-axis-label")
        .attr("text-anchor", "middle")
        .attr("x", margin.left + innerWidth / 2)
        .attr("y", height - margin.bottom / 2 + 10) // Position below x-axis
        .style("fill", "white")
        .style("font-size", "10px")
        .text("Year");

    // Y Axis Label
    svg.append("text")
        .attr("class", "y-axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -(margin.top + innerHeight / 2))
        .attr("y", margin.left / 2 - 10) // Position left of y-axis
        .style("fill", "white")
        .style("font-size", "10px")
        .text("Number of Events");

  }, [data, width, height]); // Redraw chart if data or dimensions change

  return (
    <div className="bg-slate-700 p-4 rounded-md shadow-lg">
        <h4 className="text-md font-semibold text-slate-100 mb-2">Events per Year</h4>
        <svg ref={svgRef}></svg>
    </div>
  );
};

export default BarChart;
