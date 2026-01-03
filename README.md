# Untangle Game

A mobile puzzle game built with React Native, where players must untangle a graph by moving nodes so that no edges overlap.

## Prerequisites

-   Node.js
-   Expo Go app on your mobile device (or Android Studio / Xcode for simulation)

## Setup Instructions

1.  **Install Dependencies**

    ```bash
    npm install
    ```

2.  **Start the Project**

    ```bash
    npx expo start
    ```

3.  **Run on Device / Web**
    -   **Web Browser**: Press `w` in the terminal to open the game in your browser (no phone needed).
    -   **Mobile**: Scan the QR code with the Expo Go app (Android) or Camera app (iOS).
    -   **Emulator**: Press `a` for Android Emulator, `i` for iOS Simulator.

## Project Structure

-   `src/components/GraphLevel.tsx`: Main game component handling rendering and gestures.
-   `src/utils/geometry.ts`: Mathematical logic for line intersection detection.
-   `src/data/levels.json`: JSON file containing level configurations.
-   `App.tsx`: Entry point managing level progression.

## Technical Details

-   **Graph Logic**: Nodes are draggable. Edges update in real-time.
-   **Intersection Engine**: Uses vector cross products to detect line segment intersections efficiently.
-   **Visuals**: `react-native-svg` is used for high-performance drawing of the graph.
-   **Gestures**: `react-native-gesture-handler` provides smooth touch interactions.

## Adding Levels

To add more levels, edit `src/data/levels.json`. Follow the existing structure:

```json
{
  "id": 6,
  "nodes": [{ "id": 0, "x": 100, "y": 100 }, ...],
  "edges": [{ "source": 0, "target": 1 }, ...]
}
```
