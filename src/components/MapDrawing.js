import React, { useState, useRef } from 'react';
import { 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  AppBar,
  Toolbar,
  Typography
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { getDistance } from 'geolib';

const MapDrawing = () => {
  const [coordinates, setCoordinates] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawType, setDrawType] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [polygonCoordinates, setPolygonCoordinates] = useState([]);
  const [insertPosition, setInsertPosition] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const mapCanvasRef = useRef(null);
  const [currentPath, setCurrentPath] = useState([]);

  // Generate realistic-looking coordinates from canvas position
  const generateCoordinate = (x, y) => {
    const longitude = (x / 800 * 360 - 180).toFixed(8);
    const latitude = ((1 - y / 600) * 180 - 90).toFixed(8);
    return {
      longitude: parseFloat(longitude),
      latitude: parseFloat(latitude)
    };
  };

  // Calculate distance using geolib
  const calculateDistance = (coord1, coord2) => {
    if (!coord1 || !coord2) return 0;
    return getDistance(coord1, coord2);
  };

  const startDrawing = (type) => {
    setDrawType(type);
    setIsDrawing(true);
    setShowModal(true);
    setCurrentPath([]);
  };

  const handleCanvasClick = (e) => {
    if (!isDrawing) return;

    const rect = mapCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newCoord = generateCoordinate(x, y);

    if (drawType === 'LineString') {
      setCoordinates(prev => {
        const newCoords = [...prev, {
          id: `WP${String(prev.length).padStart(2, '0')}`,
          coordinates: newCoord,
          distance: prev.length > 0 ? calculateDistance(prev[prev.length - 1].coordinates, newCoord) : 0
        }];
        return newCoords;
      });
    } else {
      setPolygonCoordinates(prev => [...prev, newCoord]);
    }

    setCurrentPath(prev => [...prev, [x, y]]);
    drawPath();
  };

  const drawPath = () => {
    const canvas = mapCanvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw mock map background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#ddd';
    
    // Draw grid
    for (let i = 0; i < canvas.width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Draw the path
    if (currentPath.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#1976d2';
      ctx.lineWidth = 2;
      ctx.moveTo(currentPath[0][0], currentPath[0][1]);
      
      currentPath.forEach(point => {
        ctx.lineTo(point[0], point[1]);
      });
      
      if (drawType === 'Polygon' && currentPath.length > 2) {
        ctx.lineTo(currentPath[0][0], currentPath[0][1]);
      }
      
      ctx.stroke();

      // Draw points
      currentPath.forEach(point => {
        ctx.beginPath();
        ctx.fillStyle = '#1976d2';
        ctx.arc(point[0], point[1], 5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && isDrawing) {
      setIsDrawing(false);
      if (drawType === 'Polygon') {
        const firstCoord = polygonCoordinates[0];
        setPolygonCoordinates(prev => [...prev, firstCoord]); // Close the polygon
      }
    }
  };

  const handleMenuOpen = (event, index) => {
    setAnchorEl(event.currentTarget);
    setSelectedRowIndex(index);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRowIndex(null);
  };

  const handlePolygonInsertion = (position) => {
    setInsertPosition(selectedRowIndex);
    startDrawing('Polygon');
    handleMenuClose();
  };

  const importPolygonPoints = () => {
    if (insertPosition !== null && polygonCoordinates.length > 0) {
      setCoordinates(prev => {
        const newCoords = [...prev];
        const polygonPoints = polygonCoordinates.map((coord, index) => ({
          id: `WP${String(prev.length + index).padStart(2, '0')}`,
          coordinates: coord,
          distance: index > 0 ? calculateDistance(polygonCoordinates[index-1], coord) : 0
        }));
        newCoords.splice(insertPosition + 1, 0, ...polygonPoints);
        return newCoords;
      });
      setPolygonCoordinates([]);
      setInsertPosition(null);
      setDrawType('LineString');
    }
  };

  return (
    <div className="h-screen w-full flex flex-col" onKeyPress={handleKeyPress} tabIndex="0">
      <AppBar position="static">
        <Toolbar>
          <Button 
            color="inherit"
            onClick={() => startDrawing('LineString')}
          >
            Draw LineString
          </Button>
        </Toolbar>
      </AppBar>
      
      <div className="flex-grow relative">
        <canvas
          ref={mapCanvasRef}
          width={800}
          height={600}
          onClick={handleCanvasClick}
          style={{ margin: '1rem', border: '1px solid #ccc' }}
        />
      </div>

      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {drawType === 'LineString' ? 'Mission Planner' : 'Polygon Creator'}
        </DialogTitle>
        <DialogContent>
          <Paper style={{ marginTop: '1rem' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Waypoint</TableCell>
                  <TableCell>Coordinates</TableCell>
                  <TableCell align="right">Distance (m)</TableCell>
                  <TableCell width={48} />
                </TableRow>
              </TableHead>
              <TableBody>
                {(drawType === 'LineString' ? coordinates : polygonCoordinates.map((coord, index) => ({
                  id: `P${String(index).padStart(2, '0')}`,
                  coordinates: coord,
                  distance: index > 0 ? calculateDistance(polygonCoordinates[index-1], coord) : 0
                }))).map((point, index) => (
                  <TableRow key={point.id}>
                    <TableCell>{point.id}</TableCell>
                    <TableCell>
                      {point.coordinates.longitude}, {point.coordinates.latitude}
                    </TableCell>
                    <TableCell align="right">{point.distance}</TableCell>
                    <TableCell>
                      {drawType === 'LineString' && (
                        <>
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, index)}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          {drawType === 'Polygon' && (
            <div style={{ marginTop: '1rem', textAlign: 'right' }}>
              <Button 
                variant="contained" 
                onClick={importPolygonPoints}
              >
                Import Points
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handlePolygonInsertion('before')}>
          Insert Polygon Before
        </MenuItem>
        <MenuItem onClick={() => handlePolygonInsertion('after')}>
          Insert Polygon After
        </MenuItem>
      </Menu>
    </div>
  );
};

export default MapDrawing;