Make sure to update PATH_TO_THIS_DIR.

```
git clone --recursive https://github.com/castle-games/obs-studio.git
cd obs-studio/
# change cmake/Modules/ObsHelpers.cmake so that fixup_bundle.sh always runs
mkdir build
cd build
cmake .. -DDISABLE_UI=true -DENABLE_SCRIPTING=false -DCMAKE_INSTALL_PREFIX=PATH_TO_THIS_DIR
make
sudo make install
```

delete SDL so file from this dir's bin/

fix ffmpeg-mux rpath:

```
cd macosx/obs/data/obs-plugins/obs-ffmpeg/
install_name_tool -add_rpath @executable_path/../../../bin/ ffmpeg-mux
```