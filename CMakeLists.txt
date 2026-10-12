cmake_minimum_required(VERSION 3.22)
project(Afterglow VERSION 0.1.0 LANGUAGES C CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
if(MSVC)
  set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")
endif()
include(CTest)
option(AFTERGLOW_BUILD_PLUGIN "Build JUCE VST3 and standalone application" ON)
set(AFTERGLOW_JUCE_PATH "" CACHE PATH "Optional local JUCE 8.0.6 checkout")

file(GLOB DAISY_SOURCES CONFIGURE_DEPENDS Source/third_party/DaisySP/Drums/*.cpp Source/third_party/DaisySP/Filters/*.cpp)
add_library(AfterglowDSP STATIC Source/DrumEngine.cpp ${DAISY_SOURCES})
target_include_directories(AfterglowDSP PUBLIC Source Source/third_party/DaisySP Source/third_party/DaisySP/Utility Source/third_party/DaisySP/Filters Source/third_party/DaisySP/Synthesis)
add_library(AfterglowSequence STATIC Source/Sequencer.cpp)
target_include_directories(AfterglowSequence PUBLIC Source)
option(AFTERGLOW_BUILD_DEMO "Build offline audio demo renderer" ON)
if(AFTERGLOW_BUILD_DEMO)
  add_executable(ag_render_demo tools/render_demo.cpp)
  target_link_libraries(ag_render_demo PRIVATE AfterglowDSP AfterglowSequence)
endif()

if(AFTERGLOW_BUILD_PLUGIN)
  if(AFTERGLOW_JUCE_PATH)
    add_subdirectory("${AFTERGLOW_JUCE_PATH}" "${CMAKE_BINARY_DIR}/JUCE")
  else()
    include(FetchContent)
    FetchContent_Declare(JUCE GIT_REPOSITORY https://github.com/juce-framework/JUCE.git GIT_TAG 8.0.6 GIT_SHALLOW TRUE)
    FetchContent_MakeAvailable(JUCE)
  endif()
  juce_add_plugin(Afterglow
    COMPANY_NAME "Afterglow Audio"
    BUNDLE_ID "audio.afterglow.drums"
    PLUGIN_MANUFACTURER_CODE Aglw
    PLUGIN_CODE Ag09
    PRODUCT_NAME "Afterglow"
    DESCRIPTION "909 and 808 inspired drum machine and sample sequencer"
    IS_SYNTH TRUE NEEDS_MIDI_INPUT TRUE NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE EDITOR_WANTS_KEYBOARD_FOCUS FALSE
    COPY_PLUGIN_AFTER_BUILD FALSE
    FORMATS VST3 Standalone
    VST3_CATEGORIES Instrument Drum)
  juce_generate_juce_header(Afterglow)
  target_sources(Afterglow PRIVATE Source/PluginProcessor.cpp Source/PluginEditor.cpp)
  target_compile_definitions(Afterglow PUBLIC JUCE_WEB_BROWSER=0 JUCE_USE_CURL=0 JUCE_VST3_CAN_REPLACE_VST2=0)
  target_link_libraries(Afterglow PRIVATE AfterglowDSP AfterglowSequence juce::juce_audio_utils PUBLIC juce::juce_recommended_config_flags)
endif()

if(BUILD_TESTING)
  add_executable(ag_sequencer_tests tests/sequencer_tests.cpp)
  target_link_libraries(ag_sequencer_tests PRIVATE AfterglowSequence)
  add_test(NAME sequencer COMMAND ag_sequencer_tests)
  add_executable(ag_dsp_tests tests/dsp_tests.cpp)
  target_link_libraries(ag_dsp_tests PRIVATE AfterglowDSP)
  add_test(NAME dsp COMMAND ag_dsp_tests)
  if(AFTERGLOW_BUILD_PLUGIN)
    juce_add_console_app(ag_processor_tests PRODUCT_NAME "Afterglow Processor Tests")
    target_sources(ag_processor_tests PRIVATE tests/processor_tests.cpp)
    target_link_libraries(ag_processor_tests PRIVATE Afterglow AfterglowDSP AfterglowSequence juce::juce_audio_utils)
    target_include_directories(ag_processor_tests PRIVATE "${CMAKE_BINARY_DIR}/Afterglow_artefacts/JuceLibraryCode" Source)
    add_test(NAME processor COMMAND ag_processor_tests)
  endif()
endif()
