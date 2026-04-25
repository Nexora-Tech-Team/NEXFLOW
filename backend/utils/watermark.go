package utils

import (
	"fmt"
	"math"
	"os"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
)

type WatermarkConfig struct {
	Type      string // "text" or "image"
	Text      string
	Color     string
	Opacity   float64
	Size      float64
	Position  string
	Angle     float64
	Tiled     bool
	ImagePath string
}

// A4 page dimensions in PDF points (1pt = 1/72 inch)
const pageW, pageH = 595.0, 842.0

// generateTileOffsets calculates a dense grid of (x, y) offsets for tiling.
// Uses pos:tl anchor — x is pts from left, y is pts from top (we negate for PDF coords).
func generateTileOffsets(size float64) [][2]float64 {
	stepX := math.Max(size*4.5, pageW/5)
	stepY := math.Max(size*3.0, pageH/7)

	var offsets [][2]float64
	for y := stepY / 2; y < pageH; y += stepY {
		for x := stepX / 2; x < pageW; x += stepX {
			offsets = append(offsets, [2]float64{x, y})
		}
	}
	return offsets
}

func ApplyWatermark(filePath string, wm WatermarkConfig) ([]byte, error) {
	if wm.Type == "image" && wm.ImagePath != "" {
		return applyImageWatermark(filePath, wm)
	}
	return applyTextWatermark(filePath, wm)
}

func applyTextWatermark(filePath string, wm WatermarkConfig) ([]byte, error) {
	r, g, b := hexToRGB(wm.Color)
	opacity := wm.Opacity / 100.0
	if opacity <= 0 {
		opacity = 0.15
	}
	if opacity > 1 {
		opacity = 1
	}
	angle := wm.Angle
	if angle == 0 {
		angle = 35
	}
	size := wm.Size
	if size == 0 {
		size = 36
	}
	text := wm.Text
	if text == "" {
		text = "FOR INTERNAL USE"
	}

	conf := model.NewDefaultConfiguration()

	if wm.Tiled {
		offsets := generateTileOffsets(size)
		return chainWatermarks(filePath, len(offsets), func(in, out string, i int) error {
			off := offsets[i]
			desc := fmt.Sprintf(
				"font:Helvetica, points:%.0f, scale:1 abs, color:%.3f %.3f %.3f, rotation:%.0f, opacity:%.2f, mode:2, pos:tl, off:%.0f -%.0f",
				size, r, g, b, angle, opacity, off[0], off[1],
			)
			return api.AddTextWatermarksFile(in, out, nil, false, text, desc, conf)
		})
	}

	tmpOut, err := os.CreateTemp("", "wm_*.pdf")
	if err != nil {
		return readFile(filePath)
	}
	tmpOutPath := tmpOut.Name()
	tmpOut.Close()
	defer os.Remove(tmpOutPath)

	desc := fmt.Sprintf(
		"font:Helvetica, points:%.0f, scale:1 abs, color:%.3f %.3f %.3f, rotation:%.0f, opacity:%.2f, mode:2",
		size, r, g, b, angle, opacity,
	)

	err = api.AddTextWatermarksFile(filePath, tmpOutPath, nil, false, text, desc, conf)
	if err != nil {
		return readFile(filePath)
	}
	return readFile(tmpOutPath)
}

func applyImageWatermark(filePath string, wm WatermarkConfig) ([]byte, error) {
	opacity := wm.Opacity / 100.0
	if opacity <= 0 {
		opacity = 0.15
	}
	if opacity > 1 {
		opacity = 1
	}
	angle := wm.Angle

	conf := model.NewDefaultConfiguration()

	if wm.Tiled {
		offsets := generateTileOffsets(80) // treat image tiles as ~80pt size
		return chainWatermarks(filePath, len(offsets), func(in, out string, i int) error {
			off := offsets[i]
			desc := fmt.Sprintf(
				"scale:0.25 rel, opacity:%.2f, rotation:%.0f, pos:tl, off:%.0f -%.0f",
				opacity, angle, off[0], off[1],
			)
			return api.AddImageWatermarksFile(in, out, nil, false, wm.ImagePath, desc, conf)
		})
	}

	tmpOut, err := os.CreateTemp("", "wm_*.pdf")
	if err != nil {
		return readFile(filePath)
	}
	tmpOutPath := tmpOut.Name()
	tmpOut.Close()
	defer os.Remove(tmpOutPath)

	desc := fmt.Sprintf("scale:0.5 rel, opacity:%.2f, rotation:%.0f", opacity, angle)
	err = api.AddImageWatermarksFile(filePath, tmpOutPath, nil, false, wm.ImagePath, desc, conf)
	if err != nil {
		return readFile(filePath)
	}
	return readFile(tmpOutPath)
}

func chainWatermarks(filePath string, count int, apply func(in, out string, i int) error) ([]byte, error) {
	current := filePath
	var temps []string

	for i := 0; i < count; i++ {
		tmp, err := os.CreateTemp("", "wm_*.pdf")
		if err != nil {
			cleanupTemps(temps)
			return readFile(filePath)
		}
		tmp.Close()
		out := tmp.Name()
		temps = append(temps, out)

		if err := apply(current, out, i); err != nil {
			cleanupTemps(temps)
			return readFile(filePath)
		}
		current = out
	}

	data, err := readFile(current)
	cleanupTemps(temps)
	return data, err
}

func cleanupTemps(paths []string) {
	for _, p := range paths {
		os.Remove(p)
	}
}

func readFile(path string) ([]byte, error) {
	return os.ReadFile(path)
}

func hexToRGB(hex string) (float64, float64, float64) {
	if len(hex) == 0 {
		return 0.8, 0.8, 0.8
	}
	if hex[0] == '#' {
		hex = hex[1:]
	}
	if len(hex) != 6 {
		return 0.8, 0.8, 0.8
	}

	var ri, gi, bi int
	fmt.Sscanf(hex[0:2], "%x", &ri)
	fmt.Sscanf(hex[2:4], "%x", &gi)
	fmt.Sscanf(hex[4:6], "%x", &bi)

	return float64(ri) / 255.0, float64(gi) / 255.0, float64(bi) / 255.0
}
